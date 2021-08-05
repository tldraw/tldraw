'use strict'
module.exports = parseStream

const stream = require('stream')
const TOMLParser = require('./lib/toml-parser.js')

function parseStream (stm) {
  if (stm) {
    return parseReadable(stm)
  } else {
    return parseTransform(stm)
  }
}

function parseReadable (stm) {
  const parser = new TOMLParser()
  stm.setEncoding('utf8')
  return new Promise((resolve, reject) => {
    let readable
    let ended = false
    let errored = false
    function finish () {
      ended = true
      if (readable) return
      try {
        resolve(parser.finish())
      } catch (err) {
        reject(err)
      }
    }
    function error (err) {
      errored = true
      reject(err)
    }
    stm.once('end', finish)
    stm.once('error', error)
    readNext()

    function readNext () {
      readable = true
      let data
      while ((data = stm.read()) !== null) {
        try {
          parser.parse(data)
        } catch (err) {
          return error(err)
        }
      }
      readable = false
      /* istanbul ignore if */
      if (ended) return finish()
      /* istanbul ignore if */
      if (errored) return
      stm.once('readable', readNext)
    }
  })
}

function parseTransform () {
  const parser = new TOMLParser()
  return new stream.Transform({
    objectMode: true,
    transform (chunk, encoding, cb) {
      try {
        parser.parse(chunk.toString(encoding))
      } catch (err) {
        this.emit('error', err)
      }
      cb()
    },
    flush (cb) {
      try {
        this.push(parser.finish())
      } catch (err) {
        this.emit('error', err)
      }
      cb()
    }
  })
}
