/*
 * Disclaimer:
 *
 * The code in this file is quite ugly. Usually in a review I would be very
 * unhappy if I saw something like this.
 * But it's not this code's job to look pleasant. It's job is to create heap
 * diffs while leaving the smallest possible heap footprint itself. To achieve
 * that we do a couple of things:
 *
 * - We create all objects (including functions and arrays) as early as possible
 *   and only once
 * - We create arrays using the `Array` constructor and pass the size we need
 *   to avoid re-allocations
 * - We never assign values of different types (number, object, ...) to a variable
 * - We try to avoid promises whereever possible, since they come with a big
 *   heap footprint
 * - We use setImmediate() in the right places to create a new execution context
 *   to allow garbage-collecting the old execution context's objects
 * - We have dedicated heap footprint tests (see `test/heap-footprint.test.js`)
 *   and we test if changes to this code alter its heap footprint
 */

const fs = require('fs')
const memwatch = require('@airbnb/node-memwatch')
const minimist = require('minimist')
const path = require('path')
const { createResult } = require('./result')
const { MemoryLeakError, testConstantHeapSize } = require('./testConstantHeapSize')

const argv = minimist(process.argv.slice(2))
let currentlyRunningTests = 0

module.exports = {
  iterate,
  MemoryLeakError
}

function iterate (iteratorFn, options = {}) {
  const runAndHeapDiff = () => {
    memwatch.gc()
    memwatch.gc()

    const heapDiff = new memwatch.HeapDiff()
    for (let index = 0; index < iterations; index++) {
      const result = iteratorFn()
      if (result && typeof result.then === 'function') {
        throw new Error('Tried to use iterate() on an async function. Use iterate.async() instead.')
      }
    }
    return heapDiff.end()
  }

  const { iterations = 30, gcollections = 6 } = options
  const heapDiffs = new Array(gcollections)

  for (let gcIndex = 0; gcIndex < gcollections; gcIndex++) {
    heapDiffs[gcIndex] = runAndHeapDiff()
  }

  if (argv['heap-file']) {
    saveHeapDiffs(heapDiffs, argv['heap-file'])
  }

  const heapError = testConstantHeapSize(heapDiffs, { iterations, gcollections })
  if (heapError) {
    throw heapError
  }

  return createResult(heapDiffs, { iterations, gcollections })
}

iterate.async = function iterateAsync (iteratorFn, options = {}) {
  const { iterations = 30, gcollections = 6 } = options
  const heapDiffs = new Array(gcollections)

  const runner = {
    gcIndex: 0,
    error: null,
    heapDiff: null,
    reject: () => {},
    resolve: () => {},

    run () {
      memwatch.gc()
      memwatch.gc()

      let currentIterationsDone = 0
      runner.heapDiff = new memwatch.HeapDiff()

      for (let index = 0; index < iterations; index++) {
        iteratorFn().then(
          () => {
            currentIterationsDone++
            if (currentIterationsDone === iterations) {
              setImmediate(runner.onHeapDiff)
            }
          },
          error => {
            currentIterationsDone++
            runner.error = error
            if (currentIterationsDone === iterations) {
              setImmediate(runner.onHeapDiff)
            }
          }
        )
      }
    },
    onHeapDiff () {
      memwatch.gc()
      heapDiffs[runner.gcIndex] = runner.heapDiff.end()
      runner.gcIndex++

      if (runner.gcIndex === gcollections) {
        runner.onAllDone()
      } else {
        // If `setImmediate(runner.run)` is used here we will always have leaky diffs! Why?!
        runner.run()
      }
    },
    onAllDone () {
      if (argv['heap-file']) {
        saveHeapDiffs(heapDiffs, argv['heap-file'])
      }

      currentlyRunningTests--

      if (runner.error) {
        runner.reject(runner.error)
      } else {
        const heapError = testConstantHeapSize(heapDiffs, { iterations, gcollections, sensitivity: 5 * 1024 })
        if (heapError) {
          runner.reject(heapError)
        } else {
          runner.resolve(createResult(heapDiffs, { iterations, gcollections }))
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    runner.resolve = resolve
    runner.reject = reject

    if (currentlyRunningTests > 0) {
      return reject(new Error(
        'Detected concurrently running tests. ' +
        'This will render the heap snapshots unusable. ' +
        'Make sure the tests are run strictly sequentially.'
      ))
    }
    currentlyRunningTests++

    // Since the first iterator call always inflates the heap a lot, we do a blind first run here
    const promise = iteratorFn()

    if (!promise || typeof promise.then !== 'function') {
      return reject(new Error('Tried to use iterate.async() on a synchronous function. Use iterate() instead.'))
    }

    promise.then(
      () => setImmediate(runner.run),
      error => reject(error)
    )
  })
}

function saveHeapDiffs (heapDiffs, outFileName) {
  const outFilePath = path.resolve(process.cwd(), outFileName)
  fs.writeFileSync(outFilePath, JSON.stringify(heapDiffs, null, 2), { encoding: 'utf8' })
}
