// Run with Mocha (Jest should work just fine, too)

const assert = require('assert')

const sampleLib = require('./sampleLib')
const { iteration } = require('../lib')

describe('sampleLib', () => {
  it('does not leak when creating instances and doing stuff', () => {
    assert.throws(() => iteration(100, () => {
      const instance = sampleLib.createInstance()   // <- memory leak in here
      instance.doStuff()
    }))
  })
})
