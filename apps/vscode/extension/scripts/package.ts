import { exec } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'))

const { log: jslog } = console

async function main() {
	if (fs.existsSync('./editor')) {
		fs.rmSync('./editor', { recursive: true })
	}
	if (fs.existsSync('./temp')) {
		fs.rmSync('./temp', { recursive: true })
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
