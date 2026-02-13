import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './lib/file'
import { nicelog } from './lib/nicelog'

interface ProfileResults {
	timestamp: string
	duration: number
	fileCount: number
	errorCount: number
	tsbuildInfoSize: number
	traceStats?: {
		totalTime: number
		longestFiles: Array<{ file: string; duration: number }>
	}
}

async function main() {
	nicelog('🔍 Starting TypeScript profiling...\n')

	// Allow targeting a specific workspace, default to apps/dotcom/client
	const targetWorkspace = process.argv[2] || 'apps/dotcom/client'
	const workspacePath = join(REPO_ROOT, targetWorkspace)

	if (!existsSync(join(workspacePath, 'tsconfig.json'))) {
		console.error(`❌ No tsconfig.json found in ${targetWorkspace}`)
		console.error(`Usage: yarn profile-typescript [workspace-path]`)
		console.error(`Example: yarn profile-typescript packages/editor`)
		process.exit(1)
	}

	nicelog(`   Profiling workspace: ${targetWorkspace}\n`)

	const outputDir = join(REPO_ROOT, '.ts-profile')
	const traceDir = join(outputDir, 'trace')
	const reportPath = join(outputDir, 'profile-report.md')

	// Create output directory
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true })
	}

	const results: ProfileResults = {
		timestamp: new Date().toISOString(),
		duration: 0,
		fileCount: 0,
		errorCount: 0,
		tsbuildInfoSize: 0,
	}

	// Step 1: Count files being processed
	nicelog('📊 Step 1/5: Counting TypeScript files...')
	try {
		const listFilesOutput = execFileSync(
			join(REPO_ROOT, 'node_modules/.bin/tsc'),
			['--listFiles', '--noEmit'],
			{ cwd: workspacePath, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
		)
		results.fileCount = listFilesOutput.split('\n').filter((line) => line.trim()).length
		nicelog(`   Found ${results.fileCount} files\n`)
	} catch {
		nicelog('   ⚠️  Could not count files (non-fatal)\n')
	}

	// Step 2: Calculate tsbuildinfo cache size
	nicelog('📦 Step 2/5: Calculating build cache size...')
	const findTsbuildInfo = (dir: string): string[] => {
		const results: string[] = []
		try {
			const entries = readdirSync(dir, { withFileTypes: true })
			for (const entry of entries) {
				const fullPath = join(dir, entry.name)
				if (entry.isDirectory()) {
					if (entry.name !== 'node_modules' && entry.name !== '.git') {
						results.push(...findTsbuildInfo(fullPath))
					}
				} else if (entry.name.endsWith('.tsbuildinfo')) {
					results.push(fullPath)
				}
			}
		} catch {
			// Ignore permission errors
		}
		return results
	}

	const tsbuildInfoFiles = findTsbuildInfo(REPO_ROOT)
	results.tsbuildInfoSize = tsbuildInfoFiles.reduce((total, file) => {
		try {
			const stats = readFileSync(file)
			return total + stats.length
		} catch {
			return total
		}
	}, 0)
	nicelog(
		`   Found ${tsbuildInfoFiles.length} cache files (${(results.tsbuildInfoSize / 1024 / 1024).toFixed(2)} MB)\n`
	)

	// Step 3: Run extended diagnostics
	nicelog('⏱️  Step 3/5: Running extended diagnostics...')
	const startTime = Date.now()
	try {
		const diagnosticsOutput = execFileSync(
			join(REPO_ROOT, 'node_modules/.bin/tsc'),
			['--extendedDiagnostics', '--noEmit'],
			{ cwd: workspacePath, encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }
		)
		results.duration = Date.now() - startTime

		// Save full diagnostics output
		writeFileSync(join(outputDir, 'extended-diagnostics.txt'), diagnosticsOutput)
		nicelog(`   Completed in ${(results.duration / 1000).toFixed(2)}s\n`)
	} catch (err: any) {
		results.duration = Date.now() - startTime
		if (err.stdout) {
			writeFileSync(join(outputDir, 'extended-diagnostics.txt'), err.stdout)
		}
		// Count errors from stderr
		if (err.stderr) {
			const errorLines = err.stderr.split('\n').filter((line: string) => line.includes('error TS'))
			results.errorCount = errorLines.length
		}
		nicelog(
			`   Completed in ${(results.duration / 1000).toFixed(2)}s (with ${results.errorCount} errors)\n`
		)
	}

	// Step 4: Generate trace file
	nicelog('🔬 Step 4/5: Generating trace file...')
	try {
		if (existsSync(traceDir)) {
			rmSync(traceDir, { recursive: true, force: true })
		}
		mkdirSync(traceDir, { recursive: true })

		const tscPath = join(REPO_ROOT, 'node_modules/.bin/tsc')
		execFileSync(tscPath, ['--generateTrace', traceDir, '--noEmit'], {
			cwd: workspacePath,
			encoding: 'utf-8',
			maxBuffer: 50 * 1024 * 1024,
			stdio: 'pipe',
		})

		const traceFile = join(traceDir, 'trace.json')
		if (existsSync(traceFile)) {
			nicelog(`   ✅ Trace generated at ${traceFile}\n`)
			nicelog(`   Open chrome://tracing and load this file\n`)

			// Try to parse trace for basic stats
			try {
				const trace = JSON.parse(readFileSync(traceFile, 'utf-8'))
				if (Array.isArray(trace)) {
					const checkEvents = trace.filter((e: any) => e.name === 'checkSourceFile')
					const sorted = checkEvents
						.sort((a: any, b: any) => (b.dur || 0) - (a.dur || 0))
						.slice(0, 10)

					results.traceStats = {
						totalTime: checkEvents.reduce((sum: number, e: any) => sum + (e.dur || 0), 0) / 1000,
						longestFiles: sorted.map((e: any) => ({
							file: e.args?.path || 'unknown',
							duration: (e.dur || 0) / 1000,
						})),
					}
				}
			} catch {
				// Trace parsing is optional
			}
		}
	} catch (err: any) {
		nicelog(`   ⚠️  Could not generate trace: ${err.message}\n`)
		if (err.stderr) {
			nicelog(`   Error output: ${err.stderr.slice(0, 200)}\n`)
		}
	}

	// Step 5: Generate markdown report
	nicelog('📝 Step 5/5: Generating report...')
	const report = generateReport(results, outputDir, traceDir)
	writeFileSync(reportPath, report)
	nicelog(`   ✅ Report saved to ${reportPath}\n`)

	// Print summary
	console.log('\n' + '='.repeat(80))
	console.log('📊 TypeScript Profile Summary')
	console.log('='.repeat(80))
	console.log(`Files processed:     ${results.fileCount.toLocaleString()}`)
	console.log(`Type check duration: ${(results.duration / 1000).toFixed(2)}s`)
	console.log(`Type errors:         ${results.errorCount}`)
	console.log(`Build cache size:    ${(results.tsbuildInfoSize / 1024 / 1024).toFixed(2)} MB`)
	if (results.traceStats) {
		console.log(`Total check time:    ${results.traceStats.totalTime.toFixed(2)}ms (from trace)`)
	}
	console.log('\n📄 Full report: ' + reportPath)
	console.log('🔬 Chrome trace: ' + join(traceDir, 'trace.json'))
	console.log('='.repeat(80) + '\n')
}

function generateReport(results: ProfileResults, outputDir: string, traceDir: string): string {
	const lines: string[] = []

	lines.push('# TypeScript profiling report')
	lines.push('')
	lines.push(`**Generated:** ${new Date(results.timestamp).toLocaleString()}`)
	lines.push('')

	lines.push('## Summary')
	lines.push('')
	lines.push('| Metric | Value |')
	lines.push('|--------|-------|')
	lines.push(`| Files processed | ${results.fileCount.toLocaleString()} |`)
	lines.push(`| Type check duration | ${(results.duration / 1000).toFixed(2)}s |`)
	lines.push(`| Type errors | ${results.errorCount} |`)
	lines.push(`| Build cache size | ${(results.tsbuildInfoSize / 1024 / 1024).toFixed(2)} MB |`)
	if (results.traceStats) {
		lines.push(
			`| Total type checking time | ${results.traceStats.totalTime.toFixed(2)}ms (from trace) |`
		)
	}
	lines.push('')

	if (results.traceStats && results.traceStats.longestFiles.length > 0) {
		lines.push('## Slowest files to type check')
		lines.push('')
		lines.push('| File | Duration |')
		lines.push('|------|----------|')
		for (const { file, duration } of results.traceStats.longestFiles) {
			const shortPath = file.replace(REPO_ROOT, '.')
			lines.push(`| \`${shortPath}\` | ${duration.toFixed(2)}ms |`)
		}
		lines.push('')
	}

	if (results.errorCount > 0) {
		lines.push('## Type errors')
		lines.push('')
		lines.push(
			`Found ${results.errorCount} type errors. See \`extended-diagnostics.txt\` for details.`
		)
		lines.push('')
	}

	lines.push('## How to analyze')
	lines.push('')
	lines.push('### Chrome tracing')
	lines.push('')
	lines.push('1. Open Chrome/Edge browser')
	lines.push('2. Navigate to `chrome://tracing`')
	lines.push(`3. Load file: \`${join(traceDir, 'trace.json')}\``)
	lines.push('4. Use WASD keys to navigate, search for specific files')
	lines.push('')
	lines.push('### Extended diagnostics')
	lines.push('')
	lines.push(
		`Full TypeScript diagnostics output saved to \`${join(outputDir, 'extended-diagnostics.txt')}\``
	)
	lines.push('')

	lines.push('## Recommendations')
	lines.push('')
	lines.push('### If performance is slow:')
	lines.push('')
	lines.push('1. **Clear build caches:**')
	lines.push('   ```bash')
	lines.push('   find . -name "*.tsbuildinfo" -not -path "*/node_modules/*" -delete')
	lines.push('   ```')
	lines.push('')
	lines.push('2. **Restart TypeScript server in your IDE**')
	lines.push('')
	lines.push('3. **Check for files with long check times in the Chrome trace**')
	lines.push('')
	lines.push('4. **Exclude test files from main compilation:**')
	lines.push('   Add to `tsconfig.json`:')
	lines.push('   ```json')
	lines.push('   "exclude": ["**/__test__/**", "**/*.test.ts"]')
	lines.push('   ```')
	lines.push('')
	lines.push('5. **Add to compiler options for faster dependency checking:**')
	lines.push('   ```json')
	lines.push('   "assumeChangesOnlyAffectDirectDependencies": true')
	lines.push('   ```')
	lines.push('')

	return lines.join('\n')
}

main().catch((err) => {
	console.error('❌ Unexpected error:', err)
	process.exit(1)
})
