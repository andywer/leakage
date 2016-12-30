export default function getSubsequentHeapGrowths (heapDiffs) {
  const growthSeriesSets = []
  let subsequentGrowths = []

  heapDiffs.forEach((heapDiff) => {
    if (heapDiff.change.size_bytes > 0) {
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
