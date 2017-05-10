/* eslint-env mocha */
// Using mocha, since for memory leak testing we want the tests run serially, anyway

require('chai').use(require('chai-as-promised'))

const expect = require('chai').expect
const { iterate } = require('../lib/index')

describe('leakage', () => {
  it('throws an error when testing leaky code', () => {
    const objects = []

    expect(() => iterate(() => {
      const newObject = { foo: 'bar' }
      objects.push(newObject)     // <= leak
    })).to.throw(/^Heap grew on \d subsequent garbage collections[\s\S]*Iterations between GCs: 30[\s\S]*Final GC details:/)
  })

  it('does not throw when testing non-leaky code', () => {
    expect(() => iterate(() => {
      const objects = []
      const newObject = { foo: 'bar' }
      objects.push(newObject)
    })).to.not.throw()
  })

  // Regression test: Would throw when run again with a different runner
  it('does not throw when testing non-leaky code again', () => {
    expect(() => iterate(() => {
      const objects = []
      const newObject = { foo: 'bar' }
      objects.push(newObject)
    })).to.not.throw()
  })

  it('creates a clean heap diff when running a no-op function', () => {
    const heapDiffs = iterate(() => {})
    for (const heapDiff of heapDiffs) {
      expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(1024)
    }
  })

  // it('creates a clean heap diff when running an async no-op function', () => {
  //   return iterate.async(() => Promise.resolve())
  //     .then(heapDiffs => {
  //       for (const heapDiff of heapDiffs) {
  //         expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(1024)
  //       }
  //     })
  // })

  // it('creates a clean heap diff when running an async deferred no-op function', () => {
  //   return iterate.async(() => new Promise(resolve => setTimeout(resolve, 10)))
  //     .then(heapDiffs => {
  //       for (const heapDiff of heapDiffs) {
  //         expect(Math.abs(heapDiff.change.size_bytes)).to.be.below(1024)
  //       }
  //     })
  // })

  // TODO: Add async tests
})
