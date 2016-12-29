import leftPad from 'left-pad'
import prettyBytes from 'pretty-bytes'

export default function createLeakErrorFactory (iterationCount, totalHeapDiffCount) {
  const iterationsPerHeapDiff = iterationCount / totalHeapDiffCount

  // `3` => `3`, `2.1` => `~2`, `4.7` => `~5`
  const formatInteger = (value) => Math.round(value) !== value ? '~' + Math.round(value) : value

  /**
   * @param {memwatch.HeapDiff[]} subsequentHeapGrowths
   * @return {Error}
   */
  return (subsequentHeapGrowths) => {
    const lastHeapDiff = subsequentHeapGrowths[ subsequentHeapGrowths.length - 1 ]
    const heapGrowthIterations = Math.round(subsequentHeapGrowths.length * iterationsPerHeapDiff)

    const growthInBytes = subsequentHeapGrowths
      .map((heapDiff) => heapDiff.change.size_bytes)
      .reduce((total, heapGrowth) => (total + heapGrowth), 0)

    return new Error(
      `Heap grew on ${subsequentHeapGrowths.length} subsequent garbage collections ` +
      `(${formatInteger(heapGrowthIterations)} of ${iterationCount} iterations) ` +
      `by ${prettyBytes(growthInBytes)}.\n\n` +
      `  Iterations between GCs: ${formatInteger(iterationsPerHeapDiff)}\n\n` +
      `  Final GC details:\n` +
      `  ${prettyHeapContents(lastHeapDiff).trimLeft()}\n`
    )
  }
}

function prettyHeapContents (lastHeapDiff) {
  const byGrowth = (a, b) => (a.size_bytes < b.size_bytes ? 1 : -1)

  const formatHeapContent = (item) => (
    `[${leftPad(prettyBytes(item.size_bytes), 10)}] [+ ${leftPad(item['+'], 3)}x] [- ${leftPad(item['-'], 3)}x] ${item.what}`
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
