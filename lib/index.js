const fs = require('fs')
const memwatch = require('memwatch-next')
const minimist = require('minimist')
const path = require('path')
const testConstantHeapSize = require('./testConstantHeapSize')

const argv = minimist(process.argv.slice(2))

module.exports = {
  iterate
}

function iterate (iteratorFn, options = {}) {
  const runAndHeapDiff = () => {
    memwatch.gc()
    memwatch.gc()

    const heapDiff = new memwatch.HeapDiff()
    for (let index = 0; index < iterations; index++) {
      const result = iteratorFn()
      if (result && typeof result.then === 'function') {
        throw new Error(`Tried to use iterate() on an async function. Use iterate.async() instead.`)
      }
    }
    return heapDiff.end()
  }

  const { iterations = 30, gcollections = 6 } = options
  const heapDiffs = new Array(gcollections)

  for (let gcIndex = 0; gcIndex < gcollections; gcIndex++) {
    heapDiffs[ gcIndex ] = runAndHeapDiff()
  }

  if (argv['heap-file']) {
    saveHeapDiffs(heapDiffs, argv['heap-file'])
  }

  const heapError = testConstantHeapSize(heapDiffs, { iterations, gcollections })
  if (heapError) {
    throw heapError
  }

  return heapDiffs
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
      heapDiffs[ runner.gcIndex ] = runner.heapDiff.end()
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

      if (runner.error) {
        runner.reject(runner.error)
      } else {
        const heapError = testConstantHeapSize(heapDiffs, { iterations, gcollections, sensitivity: 5 * 1024 })
        if (heapError) {
          runner.reject(heapError)
        } else {
          runner.resolve(heapDiffs)
        }
      }
    }
  }

  return new Promise((resolve, reject) => {
    runner.resolve = resolve
    runner.reject = reject

    // Since the first run always inflates the heap a lot, we do a blind first run here
    const promise = iteratorFn()

    if (!promise || typeof promise.then !== 'function') {
      return reject(new Error(`Tried to use iterate.async() on a synchronous function. Use iterate() instead.`))
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
