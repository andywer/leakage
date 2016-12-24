const sampleLib = require('./sampleLib')
const { iteration } = require('../lib')

describe('sampleLib', () => {
  it('does not leak when creating instances and doing stuff', () => {
    iteration(100, () => {
      const instance = sampleLib.createInstance()   // <- memory leak in here
      instance.doStuff()
    })
  })
})
