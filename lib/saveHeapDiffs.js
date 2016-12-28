'use strict'

const fs = require('fs')
const path = require('path')
const minimist = require('minimist')

module.exports = saveHeapDiffs

function saveHeapDiffs (heapDiffs) {
  const argv = minimist(process.argv.slice(2))

  if (argv['heap-file']) {
    const outFilePath = path.resolve(process.cwd(), argv['heap-file'])
    fs.writeFileSync(outFilePath, JSON.stringify(heapDiffs, null, 2), { encoding: 'utf8' })
  }
}
