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

  it('returns a useful test result and can print its summary', () => {
    const result = iterate(() => {}, { gcollections: 2, iterations: 10 })
    expect(result.heapDiffs).to.be.an('array')
    expect(result.gcollections).to.be.a('number')
    expect(result.iterations).to.be.a('number')

    const summaryLines = []
    result.printSummary('Some title', line => summaryLines.push(line))

    expect(summaryLines[0].trim()).to.equal('Leak test summary - Some title:')
    expect(summaryLines[1].trim()).to.equal('Did 2 heap diffs, iterating 10 times each.')
  })
})
