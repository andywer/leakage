/* eslint-env mocha */
// Using mocha, since for memory leak testing we want the tests run serially, anyway

require('chai').use(require('chai-as-promised'))

const assert = require('chai').assert
const expect = require('chai').expect
const { iterate, LeakageError } = require('../lib/index')

describe('leakage', () => {
  it('throws an error when testing leaky code', () => {
    const objects = []

    expect(() => iterate(() => {
      const newObject = { foo: 'bar' }
      objects.push(newObject)     // <= leak
    })).to.throw(LeakageError, /Heap grew on \d subsequent garbage collections[\s\S]*Iterations between GCs: 30[\s\S]*Final GC details:/)
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

  it('returns a rejecting promise when testing leaky code', () => {
    const objects = []

    return expect(
      iterate.async(() => new Promise(
        resolve => setTimeout(() => {
          const newObject = {
            foo: 'bar',
            baz () {
              return 'Some output'
            }
          }
          objects.push(newObject)     // <= leak
          resolve()
        }, 20)
      ))
    ).to.eventually.be.rejectedWith(LeakageError, /^Heap grew on \d subsequent garbage collections[\s\S]*Iterations between GCs: 30[\s\S]*Final GC details:/)
  })

  it('returns a resolving promise when testing non-leaky code', () => {
    const promise = iterate.async(() => new Promise(
      resolve => setTimeout(() => {
        const objects = []
        const newObject = { foo: 'bar' }
        objects.push(newObject)
        resolve()
      }, 20)
    ))
    assert(promise.then)
    expect(typeof promise.then).to.equal('function')

    return promise
  })
})
