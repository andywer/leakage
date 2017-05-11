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

  // TODO: Add async tests
})
