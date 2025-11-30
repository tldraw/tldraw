import { execFileSync, spawn } from 'child_process'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { REPO_ROOT } from './lib/file'
import { nicelog } from './lib/nicelog'

interface TsServerStats {
	timestamp: string
	memoryUsage: {
		heapUsed: number
		heapTotal: number
		external: number
		rss: number
	}
	requestCounts: Map<string, number>
	slowRequests: Array<{
		command: string
		file?: string
		duration: number
	}>
	projectInfo?: {
		configFiles: string[]
		fileCount: number
		externalFiles: number
	}
}

async function main() {
	nicelog('🔍 Starting TSServer profiling...\n')

	const targetWorkspace = process.argv[2] || 'apps/dotcom/client'
	const workspacePath = join(REPO_ROOT, targetWorkspace)

	if (!existsSync(join(workspacePath, 'tsconfig.json'))) {
		console.error(`❌ No tsconfig.json found in ${targetWorkspace}`)
		console.error(`Usage: yarn profile-tsserver [workspace-path]`)
		console.error(`Example: yarn profile-tsserver packages/editor`)
		process.exit(1)
	}

	nicelog(`   Profiling workspace: ${targetWorkspace}\n`)

	const outputDir = join(REPO_ROOT, '.ts-profile')
	const tsserverLogPath = join(outputDir, 'tsserver.log')
	const reportPath = join(outputDir, 'tsserver-report.md')

	// Create output directory
	if (!existsSync(outputDir)) {
		mkdirSync(outputDir, { recursive: true })
	}

	const stats: TsServerStats = {
		timestamp: new Date().toISOString(),
		memoryUsage: {
			heapUsed: 0,
			heapTotal: 0,
			external: 0,
			rss: 0,
		},
		requestCounts: new Map(),
		slowRequests: [],
	}

	nicelog('📊 Collecting TSServer information...\n')

	// Step 1: Get project info
	nicelog('Step 1/4: Analyzing project structure...')
	try {
		const tscPath = join(REPO_ROOT, 'node_modules/.bin/tsc')
		const listFilesOutput = execFileSync(tscPath, ['--listFiles', '--noEmit'], {
			cwd: workspacePath,
			encoding: 'utf-8',
			maxBuffer: 50 * 1024 * 1024,
		})

		const files = listFilesOutput.split('\n').filter((line) => line.trim())
		const configFiles = files.filter((f) => f.includes('tsconfig.json'))
		const externalFiles = files.filter((f) => f.includes('node_modules')).length

		stats.projectInfo = {
			configFiles,
			fileCount: files.length,
			externalFiles,
		}

		nicelog(`   Found ${files.length} files (${externalFiles} from node_modules)\n`)
	} catch {
		nicelog('   ⚠️  Could not analyze project (non-fatal)\n')
	}

	// Step 2: Check for existing TSServer logs
	nicelog('Step 2/4: Checking for IDE TSServer logs...')

	const possibleLogLocations = [
		// VSCode
		join(process.env.HOME || '', 'Library/Application Support/Code/logs'),
		join(process.env.HOME || '', '.config/Code/logs'),
		// Cursor
		join(process.env.HOME || '', 'Library/Application Support/Cursor/logs'),
		join(process.env.HOME || '', '.config/Cursor/logs'),
	].filter(existsSync)

	if (possibleLogLocations.length > 0) {
		nicelog(`   Found IDE log locations:\n`)
		possibleLogLocations.forEach((loc) => {
			nicelog(`   - ${loc}\n`)
		})
		nicelog(`\n   💡 To enable verbose TSServer logging in VSCode/Cursor:\n`)
		nicelog(`      1. Open settings (Cmd+,)\n`)
		nicelog(`      2. Search for "typescript.tsserver.log"\n`)
		nicelog(`      3. Set to "verbose"\n`)
		nicelog(`      4. Reload window and reproduce the slowness\n`)
		nicelog(`      5. Run: TypeScript: Open TS Server log\n\n`)
	} else {
		nicelog('   No IDE logs found\n')
	}

	// Step 3: Start a TSServer instance for profiling
	nicelog('Step 3/4: Starting TSServer with profiling...')

	const tsserverPath = join(REPO_ROOT, 'node_modules/typescript/lib/tsserver.js')

	nicelog(`   Starting TSServer for ${targetWorkspace}...\n`)
	nicelog(`   This will simulate language server requests...\n\n`)

	// Create a test scenario by opening files and requesting completions
	const testFiles = [
		join(workspacePath, 'src/main.tsx'),
		join(workspacePath, 'src/index.tsx'),
		join(workspacePath, 'src/App.tsx'),
	].filter(existsSync)

	if (testFiles.length === 0) {
		nicelog('   ⚠️  No test files found in src/ directory\n')
		nicelog('   Skipping interactive profiling\n\n')
	} else {
		nicelog(`   Will profile ${testFiles.length} files...\n\n`)

		// Run TSServer with tracing
		const tsserver = spawn(
			'node',
			[
				'--trace-warnings',
				'--max-old-space-size=4096',
				tsserverPath,
				'--logVerbosity',
				'verbose',
				'--logFile',
				tsserverLogPath,
			],
			{
				cwd: workspacePath,
				stdio: ['pipe', 'pipe', 'pipe'],
			}
		)

		let requestId = 0
		const responses: any[] = []

		// Helper to send TSServer requests
		const sendRequest = (command: string, args: any) => {
			const req = {
				seq: ++requestId,
				type: 'request',
				command,
				arguments: args,
			}
			tsserver.stdin.write(JSON.stringify(req) + '\n')
			return requestId
		}

		// Collect responses
		let buffer = ''
		tsserver.stdout.on('data', (data) => {
			buffer += data.toString()
			const lines = buffer.split('\n')
			buffer = lines.pop() || ''

			for (const line of lines) {
				if (line.trim().startsWith('{')) {
					try {
						const msg = JSON.parse(line)
						if (msg.type === 'response') {
							responses.push(msg)
						}
					} catch {
						// Ignore parse errors
					}
				}
			}
		})

		// Wait for TSServer to start
		await new Promise((resolve) => setTimeout(resolve, 2000))

		// Run test scenarios
		for (const file of testFiles) {
			nicelog(`   Testing ${file.replace(REPO_ROOT, '.')}...\n`)

			// Open file
			sendRequest('open', { file })
			await new Promise((resolve) => setTimeout(resolve, 500))

			// Request completions at various positions
			sendRequest('completions', { file, line: 1, offset: 1 })
			await new Promise((resolve) => setTimeout(resolve, 300))

			// Request quick info
			sendRequest('quickinfo', { file, line: 1, offset: 1 })
			await new Promise((resolve) => setTimeout(resolve, 300))

			// Request definition
			sendRequest('definition', { file, line: 1, offset: 1 })
			await new Promise((resolve) => setTimeout(resolve, 300))
		}

		// Request project info
		sendRequest('projectInfo', { file: testFiles[0], needFileNameList: true })
		await new Promise((resolve) => setTimeout(resolve, 1000))

		// Analyze responses
		for (const response of responses) {
			const command = response.command || 'unknown'
			stats.requestCounts.set(command, (stats.requestCounts.get(command) || 0) + 1)

			// Track slow requests (using performanceData if available)
			if (response.performanceData) {
				const duration = response.performanceData.updateGraphDurationMs || 0
				if (duration > 100) {
					stats.slowRequests.push({
						command,
						duration,
					})
				}
			}
		}

		// Get memory usage
		sendRequest('status', {})
		await new Promise((resolve) => setTimeout(resolve, 500))

		// Cleanup
		tsserver.kill()
		await new Promise((resolve) => setTimeout(resolve, 500))

		nicelog('   ✅ Profiling complete\n\n')
	}

	// Step 4: Generate report
	nicelog('Step 4/4: Generating report...')

	const report = generateReport(stats, outputDir, tsserverLogPath)
	writeFileSync(reportPath, report)
	nicelog(`   ✅ Report saved to ${reportPath}\n\n`)

	// Print summary
	console.log('='.repeat(80))
	console.log('📊 TSServer Profile Summary')
	console.log('='.repeat(80))

	if (stats.projectInfo) {
		console.log(`Files in project:    ${stats.projectInfo.fileCount.toLocaleString()}`)
		console.log(`External files:      ${stats.projectInfo.externalFiles.toLocaleString()}`)
		console.log(`Config files:        ${stats.projectInfo.configFiles.length}`)
	}

	if (stats.requestCounts.size > 0) {
		console.log('\nRequest counts:')
		Array.from(stats.requestCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.forEach(([cmd, count]) => {
				console.log(`  ${cmd}: ${count}`)
			})
	}

	if (stats.slowRequests.length > 0) {
		console.log('\nSlow requests (>100ms):')
		stats.slowRequests
			.sort((a, b) => b.duration - a.duration)
			.slice(0, 5)
			.forEach((req) => {
				console.log(`  ${req.command}: ${req.duration.toFixed(0)}ms`)
			})
	}

	console.log('\n📄 Full report: ' + reportPath)
	if (existsSync(tsserverLogPath)) {
		console.log('📋 TSServer log: ' + tsserverLogPath)
	}
	console.log('='.repeat(80) + '\n')
}

function generateReport(
	stats: TsServerStats,
	_outputDir: string,
	_tsserverLogPath: string
): string {
	const lines: string[] = []

	lines.push('# TSServer profiling report')
	lines.push('')
	lines.push(`**Generated:** ${new Date(stats.timestamp).toLocaleString()}`)
	lines.push('')

	lines.push('## Summary')
	lines.push('')

	if (stats.projectInfo) {
		lines.push('### Project structure')
		lines.push('')
		lines.push('| Metric | Value |')
		lines.push('|--------|-------|')
		lines.push(`| Total files | ${stats.projectInfo.fileCount.toLocaleString()} |`)
		lines.push(`| External files | ${stats.projectInfo.externalFiles.toLocaleString()} |`)
		lines.push(
			`| % External | ${((stats.projectInfo.externalFiles / stats.projectInfo.fileCount) * 100).toFixed(1)}% |`
		)
		lines.push(`| Config files | ${stats.projectInfo.configFiles.length} |`)
		lines.push('')

		if (stats.projectInfo.configFiles.length > 0) {
			lines.push('**Config files:**')
			lines.push('')
			stats.projectInfo.configFiles.forEach((f) => {
				lines.push(`- \`${f.replace(process.env.HOME || '', '~')}\``)
			})
			lines.push('')
		}
	}

	if (stats.requestCounts.size > 0) {
		lines.push('### Request counts')
		lines.push('')
		lines.push('| Command | Count |')
		lines.push('|---------|-------|')
		Array.from(stats.requestCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.forEach(([cmd, count]) => {
				lines.push(`| ${cmd} | ${count} |`)
			})
		lines.push('')
	}

	if (stats.slowRequests.length > 0) {
		lines.push('### Slow requests (>100ms)')
		lines.push('')
		lines.push('| Command | Duration |')
		lines.push('|---------|----------|')
		stats.slowRequests
			.sort((a, b) => b.duration - a.duration)
			.forEach((req) => {
				lines.push(`| ${req.command} | ${req.duration.toFixed(0)}ms |`)
			})
		lines.push('')
	}

	lines.push('## How to diagnose performance issues')
	lines.push('')

	lines.push('### 1. Enable verbose TSServer logging in your IDE')
	lines.push('')
	lines.push('**VSCode/Cursor:**')
	lines.push('')
	lines.push('1. Open settings (Cmd+,)')
	lines.push('2. Search for `typescript.tsserver.log`')
	lines.push('3. Set to `verbose`')
	lines.push('4. Search for `typescript.tsserver.trace`')
	lines.push('5. Set to `verbose`')
	lines.push('6. Reload window (Cmd+Shift+P → "Reload Window")')
	lines.push('7. Reproduce the performance issue')
	lines.push('8. Run command: "TypeScript: Open TS Server log"')
	lines.push('')

	lines.push('### 2. Look for these patterns in logs')
	lines.push('')
	lines.push('- **Slow response times:** Look for requests taking >500ms')
	lines.push('- **Memory warnings:** Messages about heap size or GC')
	lines.push('- **File watching:** Excessive file change notifications')
	lines.push('- **Type checking:** Long `checkSourceFile` or `getSemanticDiagnostics` calls')
	lines.push('')

	lines.push('### 3. Common causes and fixes')
	lines.push('')

	lines.push('#### Too many files in project')
	lines.push('')
	lines.push('**Symptom:** High file count, especially from node_modules')
	lines.push('')
	lines.push('**Fix:** Add to `tsconfig.json`:')
	lines.push('```json')
	lines.push('{')
	lines.push('  "exclude": [')
	lines.push('    "node_modules",')
	lines.push('    "**/*.test.ts",')
	lines.push('    "**/*.spec.ts",')
	lines.push('    "e2e/**/*"')
	lines.push('  ]')
	lines.push('}')
	lines.push('```')
	lines.push('')

	lines.push('#### Slow module resolution')
	lines.push('')
	lines.push('**Symptom:** Slow `completions` or `definition` requests')
	lines.push('')
	lines.push('**Fix:** Simplify path mappings in `tsconfig.json`:')
	lines.push('```json')
	lines.push('{')
	lines.push('  "compilerOptions": {')
	lines.push('    "moduleResolution": "bundler",')
	lines.push('    "baseUrl": ".",')
	lines.push('    "paths": {')
	lines.push('      // Minimize wildcards and keep patterns simple')
	lines.push('      "@/*": ["./src/*"]')
	lines.push('    }')
	lines.push('  }')
	lines.push('}')
	lines.push('```')
	lines.push('')

	lines.push('#### Memory issues')
	lines.push('')
	lines.push('**Symptom:** Slowdowns after editing for a while, or high RSS memory')
	lines.push('')
	lines.push('**Fix:** Increase TSServer memory in VSCode settings:')
	lines.push('```json')
	lines.push('{')
	lines.push('  "typescript.tsserver.maxTsServerMemory": 8192')
	lines.push('}')
	lines.push('```')
	lines.push('')

	lines.push('#### Project references issues')
	lines.push('')
	lines.push('**Symptom:** Multiple config files, slow cross-package navigation')
	lines.push('')
	lines.push('**Fix:** Ensure project references are built:')
	lines.push('```bash')
	lines.push('yarn typecheck  # or yarn build')
	lines.push('```')
	lines.push('')

	lines.push('### 4. Quick performance wins')
	lines.push('')
	lines.push('- **Restart TSServer:** Cmd+Shift+P → "TypeScript: Restart TS Server"')
	lines.push('- **Clear build info:** `find . -name "*.tsbuildinfo" -delete`')
	lines.push('- **Update TypeScript:** Check if newer version has fixes')
	lines.push(
		'- **Disable auto-imports:** If completions are slow, temporarily disable auto-import suggestions'
	)
	lines.push('')

	lines.push('## Profiling tools')
	lines.push('')
	lines.push('### Using the compilation profiler')
	lines.push('')
	lines.push(
		'For **batch compilation** performance (not language server), use the other profiling script:'
	)
	lines.push('```bash')
	lines.push('yarn profile-typescript apps/dotcom/client')
	lines.push('```')
	lines.push('')

	lines.push('### Using Chrome DevTools')
	lines.push('')
	lines.push('To profile TSServer with Chrome DevTools:')
	lines.push('```bash')
	lines.push('node --inspect node_modules/typescript/lib/tsserver.js \\')
	lines.push('  --logVerbosity verbose \\')
	lines.push('  --logFile tsserver.log')
	lines.push('```')
	lines.push('')
	lines.push('Then open `chrome://inspect` and attach to the process.')
	lines.push('')

	return lines.join('\n')
}

main().catch((err) => {
	console.error('❌ Unexpected error:', err)
	process.exit(1)
})
