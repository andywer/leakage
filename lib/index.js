const fs = require('fs')
const memwatch = require('memwatch-next')
const minimist = require('minimist')
const path = require('path')
const testConstantHeapSize = require('./testConstantHeapSize')

const argv = minimist(process.argv.slice(2))

module.exports = {
  iterate
}

function iterate (iteratorFn, options = { iterations: 30, gcollections: 6 }) {
  const runAndHeapDiff = () => {
    memwatch.gc()
    memwatch.gc()

    const heapDiff = new memwatch.HeapDiff()
    for (let index = 0; index < iterations; index++) {
      iteratorFn()
    }
    return heapDiff.end()
  }

  const { iterations, gcollections } = options
  const heapDiffs = new Array(gcollections)

  for (let gcIndex = 0; gcIndex < gcollections; gcIndex++) {
    heapDiffs[ gcIndex ] = runAndHeapDiff()
  }

  if (argv['heap-file']) {
    saveHeapDiffs(heapDiffs, argv['heap-file'])
  }

  const heapError = testConstantHeapSize(heapDiffs, options)
  if (heapError) {
    throw heapError
  }

  return heapDiffs
}

iterate.async = function iterateAsync (iteratorFn, options = { iterations: 30, gcollections: 6 }) {
  const { iterations, gcollections } = options
  const heapDiffs = new Array(gcollections)

  const runner = {
    gcIndex: 0,
    currentIterationsDone: 0,
    error: null,
    heapDiff: null,
    reject: () => {},
    resolve: () => {},

    run () {
      memwatch.gc()
      memwatch.gc()

      runner.heapDiff = new memwatch.HeapDiff()
      runner.currentIterationsDone = 0

      for (let index = 0; index < iterations; index++) {
        iteratorFn().then(runner.onIterationSuccess, runner.onIterationError)
      }
    },
    onIterationSuccess () {
      runner.currentIterationsDone++
      if (runner.currentIterationsDone === iterations) {
        runner.onHeapDiff()
      }
    },
    onIterationError (error) {
      runner.currentIterationsDone++
      runner.error = error
      if (runner.currentIterationsDone === iterations) {
        runner.onHeapDiff()
      }
    },
    onHeapDiff () {
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
        const heapError = testConstantHeapSize(heapDiffs, options)
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
    setImmediate(runner.run)
  })
}

function saveHeapDiffs (heapDiffs, outFileName) {
  const outFilePath = path.resolve(process.cwd(), outFileName)
  fs.writeFileSync(outFilePath, JSON.stringify(heapDiffs, null, 2), { encoding: 'utf8' })
}
