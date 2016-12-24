const memwatch = require('memwatch-next')
const prettyBytes = require('pretty-bytes')
const inspectSnapshots = require('./inspectSnapshots')

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

  triggerGC()

  iterationBlocks.forEach(({ from, to }) => {
    const heapDiff = new memwatch.HeapDiff()
    for (let iterationNo = from; iterationNo <= to; iterationNo++) {
      iteratorFunc()
    }
    triggerGC()
    heapDiffs.push(heapDiff.end())
  })

  inspectSnapshots(heapDiffs, throwOnSubsequentHeapGrows)

  const iterationBlockSize = iterationCount / iterationBlocks.length
  assertFewHeapGrowths(getSubsequentHeapGrows(heapDiffs), throwOnSubsequentHeapGrows, iterationCount, iterationBlockSize)
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

function getSubsequentHeapGrows (heapDiffs) {
  const subsequentGrowSets = []
  let subsequentGrows = []

  heapDiffs.forEach((heapDiff) => {
    if (heapDiff.change.size_bytes > 0) {
      subsequentGrows.push(heapDiff)
    } else {
      if (subsequentGrows.length > 0) {
        subsequentGrowSets.push(subsequentGrows)
      }
      subsequentGrows = []
    }
  })

  if (subsequentGrows.length > 0) {
    subsequentGrowSets.push(subsequentGrows)
  }

  return getLongestItem(subsequentGrowSets, [])
}

function getLongestItem (array, defaultValue) {
  return array.reduce((longestItem, currentItem) => (
    currentItem.length > longestItem.length ? currentItem : longestItem
  ), defaultValue)
}

function assertFewHeapGrowths (subsequentHeapGrows, throwOnSubsequentHeapGrows, iterationCount, iterationsPerHeapDiff) {
  if (subsequentHeapGrows.length >= throwOnSubsequentHeapGrows) {
    const heapGrowthIterations = Math.round(subsequentHeapGrows.length * iterationsPerHeapDiff)

    const growthInBytes = subsequentHeapGrows
      .map((heapDiff) => heapDiff.change.size_bytes)
      .reduce((total, heapGrowth) => (total + heapGrowth), 0)

    const formatInteger = (value) => Math.round(value) !== value ? '~' + Math.round(value) : value

    throw new Error(
      `Heap grew on ${subsequentHeapGrows.length} subsequent garbage collections ` +
      `(${formatInteger(heapGrowthIterations)} of ${iterationCount} iterations) ` +
      `by ${prettyBytes(growthInBytes)}.`
    )
  }
}

function triggerGC () {
  memwatch.gc()
}

function createArray (itemCount) {
  return Array.apply(null, { length: itemCount }).map((_, index) => index)
}
