import ignore from 'ignore'
import * as path from 'path'
import { exec } from './lib/exec'
import { REPO_ROOT, readFileIfExists } from './lib/file'

const ESLINT_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx']
const PRETTIER_EXTENSIONS = ['js', 'jsx', 'ts', 'tsx', 'json']

async function main() {
	const shouldFix = process.argv.includes('--fix')

	const lsFiles = await exec('git', ['ls-files', '.'], {
		processStdoutLine: () => {
			// don't print anything
		},
	})

	const filesByExtension = new Map<string, string[]>()
	for (const file of lsFiles.trim().split('\n')) {
		const ext = file.split('.').pop()
		if (!ext) continue
		let files = filesByExtension.get(ext)
		if (!files) {
			files = []
			filesByExtension.set(ext.toLowerCase(), files)
		}
		files.push(file)
	}

	let prettierFiles = PRETTIER_EXTENSIONS.flatMap((ext) => filesByExtension.get(ext) ?? [])
	let eslintFiles = ESLINT_EXTENSIONS.flatMap((ext) => filesByExtension.get(ext) ?? [])

	const relativeCwd = path.relative(REPO_ROOT, process.cwd())

	const prettierIgnoreFile = await readFileIfExists(path.join(REPO_ROOT, '.prettierignore'))
	if (prettierIgnoreFile) {
		prettierFiles = prettierFiles
			.map((f) => path.join(relativeCwd, f))
			.filter(ignore().add(prettierIgnoreFile).createFilter())
			.map((f) => path.relative(relativeCwd, f))
	}

	const eslintIgnoreFile = await readFileIfExists(path.join(REPO_ROOT, '.eslintignore'))
	if (eslintIgnoreFile) {
		eslintFiles = eslintFiles
			.map((f) => path.join(relativeCwd, f))
			.filter(ignore().add(eslintIgnoreFile).createFilter())
			.map((f) => path.relative(relativeCwd, f))
	}

	try {
		await exec('yarn', [
			'run',
			'-T',
			'prettier',
			shouldFix ? '--write' : '--check',
			'--cache',
			...prettierFiles,
		])
		await exec('yarn', [
			'run',
			'-T',
			'eslint',
			'--report-unused-disable-directives',
			shouldFix ? '--fix' : null,
			...eslintFiles,
		])
	} catch (error) {
		process.exit(1)
	}
}

main()
