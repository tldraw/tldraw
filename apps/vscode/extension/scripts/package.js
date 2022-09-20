/* eslint-disable */
//const version = require('../../../lerna.json').version
const fs = require('fs')
const pkg = require('../package.json')
const { exec } = require('child_process')

const { log: jslog } = console

async function main() {
  if (fs.existsSync('./editor')) {
    fs.rmSync('./editor', { recursive: true }, (e) => {
      if (e) {
        throw e
      }
    })
  }
  if (fs.existsSync('./temp')) {
    fs.rmSync('./temp', { recursive: true }, (e) => {
      if (e) {
        throw e
      }
    })
  }

  fs.mkdirSync('./temp')

  try {
    exec(
      `cp -r ../editor/dist editor; vsce package; mv ${pkg.name}-${pkg.version}.vsix ${'./temp'}`,
      (error, stdout, stderr) => {
        if (error) {
          throw new Error(error.message)
        }
        if (stderr && stderr.search('warning') !== 0) {
          throw new Error(stderr)
        }
      }
    )
  } catch (e) {
    jslog(`× ${pkg.name}: Build failed due to an error.`)
    jslog(e)
  }
}

main()
