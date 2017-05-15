/* eslint-env mocha */
// Using mocha, since for memory leak testing we want the tests run serially, anyway

const expect = require('chai').expect
const { iterate } = require('../lib/index')

describe('leakage', () => {
  it('creates a clean heap diff when running a sync no-op function', () => {
    const result = iterate(() => {})
    result.printSummary('sync no-op function')

    for (const heapDiff of result.heapDiffs) {
      expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(1024)
    }
  })

  it('creates a clean heap diff when running an async no-op function', () => {
    return iterate.async(() => Promise.resolve())
      .then(result => {
        result.printSummary('async no-op function')
        for (const heapDiff of result.heapDiffs) {
          expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(17 * 1024)
        }
      })
  })

  it('creates only a small heap diff when running an async deferred no-op function', () => {
    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
    return iterate.async(() => delay(10), { gcollections: 15 })
      .then(result => {
        result.printSummary('async deferred no-op function')
        for (const heapDiff of result.heapDiffs) {
          expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(24 * 1024)
        }
      })
  })

  // TODO: The sensitivity level is not exceeded when running sync code with few and with many iterations
  // TODO: The sensitivity level is not exceeded when running async code with few and with many iterations
})
