const fs = require('fs')
const memwatch = require('memwatch-next')
const minimist = require('minimist')
const path = require('path')
const assertConstantHeapSize = require('./assertConstantHeapSize')

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

  assertConstantHeapSize(heapDiffs, options)

  return heapDiffs
}

iterate.async = function iterateAsync (iteratorFn, options = { iterations: 30, gcollections: 6 }) {
  // TODO
}

function saveHeapDiffs (heapDiffs, outFileName) {
  const outFilePath = path.resolve(process.cwd(), outFileName)
  fs.writeFileSync(outFilePath, JSON.stringify(heapDiffs, null, 2), { encoding: 'utf8' })
}
