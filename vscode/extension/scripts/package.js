/* eslint-disable */
//const version = require('../../../lerna.json').version
const pkg = require('../package.json')
const { exec } = require('child_process')
const fs = require('fs')
const dir = './temp'

async function main() {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true }, (e) => {
      if (e) {
        throw e
      }
    })
  }

  fs.mkdirSync(dir)

  try {
    exec(
      `cp -r ../editor/dist editor; vsce package; mv ${pkg.name}-${pkg.version}.vsix ${dir}`,
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
    console.log(`× ${pkg.name}: Build failed due to an error.`)
    console.log(e)
  }
}

main()
