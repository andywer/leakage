/* eslint-env mocha */
// Using mocha, since for memory leak testing we want the tests run serially, anyway

require('chai').use(require('chai-as-promised'))

const expect = require('chai').expect
const { iterate } = require('../lib/index')

describe('leakage', () => {
  it('throws on iterate(<async function>)', () => {
    expect(
      () => iterate(() => Promise.resolve())
    ).to.throw(/Use iterate\.async\(\)/)
  })

  it('rejects iterate.async(<sync function>)', () => {
    return expect(
      iterate.async(() => {})
    ).to.eventually.be.rejectedWith(/Use iterate\(\)/)
  })

  it('rejects concurrent test runs', () => {
    return expect(
      Promise.all([
        iterate.async(() => Promise.resolve()),
        iterate.async(() => Promise.resolve())
      ])
    ).to.eventually.be.rejectedWith(/Detected concurrently running tests/)
  })
})
