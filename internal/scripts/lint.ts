import { execSync } from 'child_process'
import * as path from 'path'
import { exec } from './lib/exec'
import { REPO_ROOT } from './lib/file'

const OXFMT_EXTENSIONS = 'js,jsx,ts,tsx,cjs,mjs,css,md,mdx,html,yml,yaml'
const CONTEXT_COMPAT_FILE_PATTERN = /^(apps|packages|templates)\/.+\/(?:CLAUDE|AGENTS)\.md$/i

async function main() {
	const shouldFix = process.argv.includes('--fix')
	const currentOnly = process.argv.includes('--current')

	let target: string
	let fmtGlob: string
	if (currentOnly) {
		const changedFiles = execSync('git diff --name-only --diff-filter d', {
			cwd: REPO_ROOT,
			encoding: 'utf-8',
		})
			.trim()
			.split('\n')
			.filter(Boolean)

		const extPattern = new RegExp(`\\.(${OXFMT_EXTENSIONS.replace(/,/g, '|')})$`)
		const matchingFiles = changedFiles.filter((f) => extPattern.test(f))
		if (matchingFiles.length === 0) {
			console.log('No files to lint.')
			return
		}
		// Force one TypeScript file through oxlint so repo-level markdown checks
		// still run when current-only changes only touch CLAUDE.md / AGENTS.md.
		if (
			matchingFiles.some((file) => CONTEXT_COMPAT_FILE_PATTERN.test(file)) &&
			!matchingFiles.includes('internal/scripts/lint.ts')
		) {
			matchingFiles.push('internal/scripts/lint.ts')
		}
		target = matchingFiles.join(' ')
		fmtGlob = target
	} else {
		const relativeCwd = path.relative(REPO_ROOT, process.cwd())
		target = relativeCwd || '.'
		fmtGlob = relativeCwd
			? `${relativeCwd}/**/*.{${OXFMT_EXTENSIONS}}`
			: `**/*.{${OXFMT_EXTENSIONS}}`
	}

	try {
		await exec(
			'yarn',
			['oxfmt', shouldFix ? '--write' : '--check', '--no-error-on-unmatched-pattern', fmtGlob],
			{ pwd: REPO_ROOT }
		)
		if (!shouldFix) {
			await exec('yarn', ['oxlint', ...target.split(' ')], { pwd: REPO_ROOT })
		}
	} catch {
		process.exit(1)
	}
}

main()
