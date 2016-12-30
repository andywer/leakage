import memwatch from 'memwatch-next'
import getSubsequentHeapGrowths from './getSubsequentHeapGrowths'
import createLeakErrorFactory from './leakErrorFactory'
import saveHeapDiffs from './saveHeapDiffs'

/**
 * @param {number} iterationCount
 * @param {Function} iteratorFunc
 */
export default function iterate (iterationCount, iteratorFunc) {
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

function createArray (itemCount) {
  return Array.apply(null, { length: itemCount }).map((_, index) => index)
}
