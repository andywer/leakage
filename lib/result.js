const prettyBytes = require('pretty-bytes')

module.exports = {
  createResult
}

class Result {
  constructor (heapDiffs, gcollections, iterations) {
    this.heapDiffs = heapDiffs
    this.gcollections = gcollections
    this.iterations = iterations
  }

  printSummary (title, log = console.log) {
    const changesInBytes = this.heapDiffs.map(heapDiff => heapDiff.change.size_bytes)
    const average = changesInBytes.reduce((sum, change) => sum + change, 0) / changesInBytes.length
    const minimum = changesInBytes.reduce((min, change) => change < min ? change : min, Infinity)
    const maximum = changesInBytes.reduce((max, change) => change > max ? change : max, -Infinity)

    log(title ? `Leak test summary - ${title}:` : 'Leak test summary:')
    log(`  Did ${this.gcollections} heap diffs, iterating ${this.iterations} times each.`)
    log(`  Heap diff summary: ${formatDiffSize(average)} avg, ${formatDiffSize(minimum)} min, ${formatDiffSize(maximum)} max`)
    log(`  Heap diffs:        ${this.heapDiffs.map(heapDiff => formatDiffSize(heapDiff.change.size_bytes))}`)
  }
}

function createResult (heapDiffs, options) {
  const { gcollections, iterations } = options

  return new Result(heapDiffs, gcollections, iterations)
}

function formatDiffSize (size) {
  const formattedSize = prettyBytes(size)
  return size > 0 ? `+${formattedSize}` : formattedSize
}
