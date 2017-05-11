/* eslint-env mocha */
// Using mocha, since for memory leak testing we want the tests run serially, anyway

const expect = require('chai').expect
const { iterate } = require('../lib/index')

describe('leakage', () => {
  it('creates a clean heap diff when running a no-op function', () => {
    const heapDiffs = iterate(() => {})
    for (const heapDiff of heapDiffs) {
      expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(1024)
    }
  })

  it('creates a clean heap diff when running an async no-op function', () => {
    return iterate.async(() => Promise.resolve())
      .then(heapDiffs => {
        for (const heapDiff of heapDiffs) {
          expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(16 * 1024)
        }
      })
  })

  it.skip('creates a clean heap diff when running an async deferred no-op function', () => {
    return iterate.async(() => new Promise(resolve => setTimeout(resolve, 10)))
      .then(heapDiffs => {
        for (const heapDiff of heapDiffs) {
          expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(16 * 1024)
        }
      })
  })
})
