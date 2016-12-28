// Run with Mocha (Jest should work just fine, too)

const sampleLib = require('./sampleLib')
const iterate = require('../lib').iterate

describe('sampleLib', () => {
  it('does not leak when creating instances and doing stuff', () => {
    iterate(100, () => {
      const instance = sampleLib.createInstance()   // <- memory leak in here
      instance.doStuff()
    })
  })
})
