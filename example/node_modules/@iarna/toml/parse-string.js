'use strict'
module.exports = parseString

const TOMLParser = require('./lib/toml-parser.js')
const prettyError = require('./parse-pretty-error.js')

function parseString (str) {
  if (global.Buffer && global.Buffer.isBuffer(str)) {
    str = str.toString('utf8')
  }
  const parser = new TOMLParser()
  try {
    parser.parse(str)
    return parser.finish()
  } catch (err) {
    throw prettyError(err, str)
  }
}
