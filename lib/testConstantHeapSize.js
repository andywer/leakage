const ExtendableError = require('es6-error')
const prettyBytes = require('pretty-bytes')

class MemoryLeakError extends ExtendableError { }

module.exports = {
  MemoryLeakError,
  testConstantHeapSize
}

function testConstantHeapSize (heapDiffs, { iterations, gcollections, sensitivity = 1024 }) {
  const subsequentHeapGrowths = getSubsequentHeapGrowths(heapDiffs, sensitivity)
  const throwOnSubsequentHeapGrowths = Math.floor(heapDiffs.length * 2 / 3)

  if (subsequentHeapGrowths.length > throwOnSubsequentHeapGrowths) {
    const lastHeapDiff = subsequentHeapGrowths[subsequentHeapGrowths.length - 1]
    const heapGrowthIterations = Math.round(subsequentHeapGrowths.length * iterations)

    const growthInBytes = subsequentHeapGrowths
      .map(heapDiff => heapDiff.change.size_bytes)
      .reduce((total, heapGrowth) => (total + heapGrowth), 0)

    return new MemoryLeakError(
      `Heap grew on ${subsequentHeapGrowths.length} subsequent garbage collections ` +
      `(${formatInteger(heapGrowthIterations)} of ${iterations * gcollections} iterations) ` +
      `by ${prettyBytes(growthInBytes)}.\n\n` +
      `  Iterations between GCs: ${formatInteger(iterations)}\n\n` +
      '  Final GC details:\n' +
      `  ${prettyHeapContents(lastHeapDiff).trimLeft()}\n`
    )
  } else {
    return null
  }
}

function getSubsequentHeapGrowths (heapDiffs, sensitivity) {
  const growthSeriesSets = []
  let subsequentGrowths = []

  heapDiffs.forEach(heapDiff => {
    if (heapDiff.change.size_bytes > sensitivity) {
      subsequentGrowths.push(heapDiff)
    } else {
      if (subsequentGrowths.length > 0) {
        growthSeriesSets.push(subsequentGrowths)
      }
      subsequentGrowths = []
    }
  })

  if (subsequentGrowths.length > 0) {
    growthSeriesSets.push(subsequentGrowths)
  }

  return getLongestItem(growthSeriesSets, [])
}

function getLongestItem (array, defaultValue) {
  return array.reduce((longestItem, currentItem) => (
    currentItem.length > longestItem.length ? currentItem : longestItem
  ), defaultValue)
}

function prettyHeapContents (lastHeapDiff) {
  const byGrowth = (a, b) => (a.size_bytes < b.size_bytes ? 1 : -1)

  const formatHeapContent = (item) => (
    `[${prettyBytes(item.size_bytes).padStart(10)}] [+ ${String(item['+']).padStart(3)}x] [- ${String(item['-']).padStart(3)}x] ${item.what}`
  )

  const sortedDetails = [].concat(lastHeapDiff.change.details).sort(byGrowth)
  const formattedHeapContents = sortedDetails.map((heapContentItem) => formatHeapContent(heapContentItem))

  const heapContentLines = formattedHeapContents.length > 4
    ? formattedHeapContents.slice(0, 4).concat(`... (${formattedHeapContents.length - 4} more)`)
    : formattedHeapContents

  return heapContentLines
    .map((line) => `  ${line}`)
    .join('\n')
}

function formatInteger (value) {
  return Math.round(value) !== value ? '~' + Math.round(value) : value
}
