const memwatch = require('memwatch-next')
const prettyBytes = require('pretty-bytes')
const { getSubsequentHeapGrowths } = require('./heapDiffUtil')
const saveHeapDiffs = require('./saveHeapDiffs')

module.exports = iteration

/**
 * @param {number} iterationCount
 * @param {Function} iteratorFunc
 */
function iteration (iterationCount, iteratorFunc) {
  const garbageCollections = 6
  const throwOnSubsequentHeapGrows = 4
  iterationCount = iterationCount > garbageCollections ? iterationCount : garbageCollections

  const iterationBlocks = createIterationBlocks(iterationCount, garbageCollections)
  const heapDiffs = []

  memwatch.gc()

  iterationBlocks.forEach(({ from, to }) => {
    const heapDiff = new memwatch.HeapDiff()
    for (let iterationNo = from; iterationNo <= to; iterationNo++) {
      iteratorFunc()
    }
    memwatch.gc()
    heapDiffs.push(heapDiff.end())
  })

  saveHeapDiffs(heapDiffs, throwOnSubsequentHeapGrows)

  const subsequentHeapGrowths = getSubsequentHeapGrowths(heapDiffs)

  if (subsequentHeapGrowths.length >= throwOnSubsequentHeapGrows) {
    const newHeapError = createLeakErrorFactory(iterationCount, iterationBlocks.length)
    throw newHeapError(subsequentHeapGrowths)
  }
}

/**
 * Split complete iteration into multiple chunks.
 */
function createIterationBlocks (totalIterations, blocksToCreate) {
  return createArray(blocksToCreate)
    .map((blockIndex) => ({
      from: Math.round(blockIndex / blocksToCreate * totalIterations),
      to: Math.round((blockIndex + 1) / blocksToCreate * totalIterations) - 1
    }))
}

function createLeakErrorFactory (iterationCount, totalHeapDiffCount) {
  const iterationsPerHeapDiff = iterationCount / totalHeapDiffCount

  // `3` => `3`, `2.1` => `~2`, `4.7` => `~5`
  const formatInteger = (value) => Math.round(value) !== value ? '~' + Math.round(value) : value

  return (subsequentHeapGrowths) => {
    const heapGrowthIterations = Math.round(subsequentHeapGrowths.length * iterationsPerHeapDiff)

    const growthInBytes = subsequentHeapGrowths
      .map((heapDiff) => heapDiff.change.size_bytes)
      .reduce((total, heapGrowth) => (total + heapGrowth), 0)

    return new Error(
      `Heap grew on ${subsequentHeapGrowths.length} subsequent garbage collections ` +
      `(${formatInteger(heapGrowthIterations)} of ${iterationCount} iterations) ` +
      `by ${prettyBytes(growthInBytes)}.`
    )
  }
}

function createArray (itemCount) {
  return Array.apply(null, { length: itemCount }).map((_, index) => index)
}
