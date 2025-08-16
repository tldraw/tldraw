import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from './lib/exec'
import { REPO_ROOT } from './lib/file'

interface ContextFile {
	path: string
	depth: number
	dir: string
}

interface ParsedOptions {
	update: boolean
	recursive: boolean
	verbose: boolean
	path: string
}

/**
 * Finds the nearest CONTEXT.md file starting from the given directory
 * and walking up the directory tree until found or reaching the repository root
 */
async function findNearestContext(
	startPath: string
): Promise<{ path: string; content: string } | null> {
	let currentPath = path.resolve(startPath)
	const repoRoot = path.resolve(REPO_ROOT)

	while (true) {
		const contextPath = path.join(currentPath, 'CONTEXT.md')

		try {
			const content = await fs.readFile(contextPath, 'utf-8')
			return { path: contextPath, content }
		} catch {
			// File doesn't exist, continue up the directory tree
			const parentPath = path.dirname(currentPath)

			// Stop if we've reached the filesystem root or gone above the repo root
			if (parentPath === currentPath || currentPath === path.dirname(repoRoot)) {
				return null
			}

			currentPath = parentPath
		}
	}
}

/**
 * Finds immediate subdirectories that contain CONTEXT.md files
 */
async function findSubdirectoriesWithContext(dirPath: string): Promise<string[]> {
	const subdirectoriesWithContext: string[] = []

	try {
		const entries = await fs.readdir(dirPath)

		for (const entry of entries) {
			const fullPath = path.join(dirPath, entry)
			try {
				const stats = await fs.stat(fullPath)

				if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
					const contextPath = path.join(fullPath, 'CONTEXT.md')
					try {
						await fs.access(contextPath)
						subdirectoriesWithContext.push(entry)
					} catch {
						// No CONTEXT.md in this subdirectory
					}
				}
			} catch {
				// Skip if can't stat the entry
			}
		}
	} catch {
		// Skip if can't read the directory
	}

	return subdirectoriesWithContext
}

/**
 * Creates a git diff command that excludes subdirectories with CONTEXT.md but includes their CONTEXT.md files
 * Includes both committed and uncommitted changes compared to main branch
 */
async function createFilteredGitDiff(dirPath: string, relativePath: string): Promise<string> {
	const subdirs = await findSubdirectoriesWithContext(dirPath)

	if (subdirs.length === 0) {
		// No subdirectories with CONTEXT.md, use regular diff (includes working directory changes)
		return `git diff main -- ${relativePath}`
	}

	// Build pathspec that excludes subdirectories but includes their CONTEXT.md files
	const pathspecs = [relativePath] // Include the directory itself

	// Exclude each subdirectory that has CONTEXT.md
	for (const subdir of subdirs) {
		pathspecs.push(`:(exclude)${relativePath}/${subdir}`)
		// But include the subdirectory's CONTEXT.md file
		pathspecs.push(`${relativePath}/${subdir}/CONTEXT.md`)
	}

	return `git diff main -- ${pathspecs.join(' ')}`
}

/**
 * Gets a summary of changes in a directory, excluding managed subdirectories
 */
async function getDirectoryChangeSummary(
	dirPath: string,
	relativeDirPath: string
): Promise<string> {
	try {
		const gitDiffCommand = await createFilteredGitDiff(dirPath, relativeDirPath)
		const result = await exec('sh', ['-c', gitDiffCommand], { pwd: REPO_ROOT })
		const stdout = result

		if (!stdout.trim()) {
			return 'No changes detected in this directory (excluding managed subdirectories).'
		}

		// Parse the diff to provide a summary
		const lines = stdout.split('\n')
		const changedFiles = new Set<string>()
		let addedLines = 0
		let removedLines = 0

		for (const line of lines) {
			if (line.startsWith('+++') || line.startsWith('---')) {
				const match = line.match(/^[+-]{3} [ab]\/(.+)/)
				if (match && match[1] !== '/dev/null') {
					changedFiles.add(match[1])
				}
			} else if (line.startsWith('+') && !line.startsWith('+++')) {
				addedLines++
			} else if (line.startsWith('-') && !line.startsWith('---')) {
				removedLines++
			}
		}

		let summary = `Changes detected:\n`
		summary += `  - ${changedFiles.size} file(s) modified\n`
		summary += `  - ${addedLines} line(s) added\n`
		summary += `  - ${removedLines} line(s) removed\n\n`

		if (changedFiles.size > 0) {
			summary += `Modified files:\n`
			for (const file of Array.from(changedFiles).slice(0, 10)) {
				// Limit to first 10
				summary += `  - ${file}\n`
			}
			if (changedFiles.size > 10) {
				summary += `  ... and ${changedFiles.size - 10} more file(s)\n`
			}
		}

		return summary
	} catch (error: any) {
		return `Error analyzing directory changes: ${error.message}`
	}
}

/**
 * Updates a CONTEXT.md file using Claude Code CLI based on detected changes in the directory
 */
async function updateContextFile(contextPath: string): Promise<void> {
	try {
		// Get directory and relative paths
		const dirPath = path.dirname(contextPath)
		const repoRoot = path.resolve(REPO_ROOT)
		let relativeDirPath = dirPath.replace(repoRoot + '/', '')

		// Handle case where we're already in the repo root
		if (relativeDirPath === dirPath) {
			relativeDirPath = '.'
		}

		console.log(`🔍 Analyzing changes in directory: ${relativeDirPath}`)

		// Get directory changes summary (this is the main information we need)
		const dirChanges = await getDirectoryChangeSummary(dirPath, relativeDirPath)
		console.log(`\n## Directory Changes Summary`)
		console.log(`Directory: ${relativeDirPath}`)
		console.log(dirChanges)

		// Check if there are any changes to work with
		if (dirChanges.includes('No changes detected')) {
			console.log(
				`✅ No changes detected in ${relativeDirPath}. CONTEXT.md appears to be up-to-date.`
			)
			return
		}

		// Check if CONTEXT.md file exists
		if (
			!(await fs
				.access(contextPath)
				.then(() => true)
				.catch(() => false))
		) {
			console.log(`📝 CONTEXT.md doesn't exist. Creating new file based on directory contents.`)
			await createNewContextFile(contextPath)
			return
		}

		console.log(`\n🔄 Using Claude Code CLI to update CONTEXT.md based on detected changes...`)

		// Use Claude Code CLI to update the context file based on directory changes
		await updateContextWithClaude(contextPath, path.basename(contextPath), dirChanges)
	} catch (error: any) {
		console.error('Error updating file:', error.message)
		process.exit(1)
	}
}

/**
 * Creates a new CONTEXT.md file using Claude Code CLI
 */
async function createNewContextFile(contextPath: string): Promise<void> {
	const dirPath = path.dirname(contextPath)
	const packageName = path.basename(dirPath)
	const isRootContext = contextPath.endsWith('/CONTEXT.md') && dirPath === REPO_ROOT

	const createPrompt = `Please create a comprehensive CONTEXT.md file for ${isRootContext ? 'this tldraw monorepo' : `the "${packageName}" package`}.

${
	isRootContext
		? `
This is the ROOT CONTEXT.md file for the entire tldraw monorepo. Please include:
- Repository Overview with purpose
- Essential Commands (development, building, testing, code quality)
- High-Level Architecture (core packages and patterns)
- Testing Patterns (Vitest and Playwright guidance)
- Development Workspace Structure (visual directory tree)
- Key Development Notes (TypeScript, monorepo management, asset workflow)
- Development Patterns (creating components, integration guidance)

The root CONTEXT.md should provide comprehensive architectural understanding and actionable workflow guidance for AI agents.`
		: `
This is a package-specific CONTEXT.md file. Please include:
- Package overview and purpose
- Architecture and key concepts specific to this package
- API patterns and usage examples
- Integration points with other packages  
- Development patterns specific to this package`
}

Please read the files in this directory to understand the codebase and create an accurate, comprehensive CONTEXT.md file.`

	try {
		const { execSync } = await import('child_process')
		execSync('claude', {
			input: createPrompt,
			cwd: dirPath,
			encoding: 'utf-8',
			timeout: 600000, // 10 minute timeout
		})
		console.log(`✅ Created new CONTEXT.md file: ${contextPath}`)
	} catch (error) {
		console.error(`❌ Failed to create CONTEXT.md: ${error}`)
		throw error
	}
}

/**
 * Updates a CONTEXT.md file using Claude Code CLI based on changes
 */
async function updateContextWithClaude(
	contextPath: string,
	relativePath: string,
	dirChanges: string
): Promise<void> {
	const dirPath = path.dirname(contextPath)
	const packageName = path.basename(dirPath)
	const isRootContext = contextPath.endsWith('/CONTEXT.md') && dirPath === REPO_ROOT

	const updatePrompt = `The CONTEXT.md file for ${isRootContext ? 'this tldraw monorepo' : `the "${packageName}" package`} needs to be updated based on recent code changes.

## Recent Changes Detected
${dirChanges}

Please review the current CONTEXT.md file and update it to reflect any changes in:
1. **Architecture changes** - new patterns, refactored components, changed APIs
2. **New features or capabilities** - added functionality that should be documented
3. **Updated dependencies or tools** - changes in build system, testing, etc.
4. **API changes** - new exports, changed interfaces, deprecated functions
5. **Development workflow changes** - new commands, updated patterns

${
	isRootContext
		? `
For the ROOT CONTEXT.md, ensure these sections remain current:
- Repository Overview and purpose
- Essential Commands (verify all commands still work)
- High-Level Architecture (reflect any architectural changes)
- Testing Patterns and Development Workspace Structure
- Key Development Notes and Development Patterns`
		: `
For this package CONTEXT.md, focus on:
- Package overview and purpose (any scope changes?)
- Architecture and key concepts (new patterns or refactoring?)
- API patterns and usage examples (new exports or breaking changes?)
- Integration points with other packages (new dependencies?)
- Development patterns specific to this package`
}

Please read the current CONTEXT.md file and other relevant files in this directory, then update the CONTEXT.md to accurately reflect the current state of the codebase.

IMPORTANT: Make focused updates based on the detected changes. Don't rewrite everything - preserve the existing structure and style while ensuring accuracy.`

	try {
		const { execSync } = await import('child_process')
		execSync('claude', {
			input: updatePrompt,
			cwd: dirPath,
			encoding: 'utf-8',
			timeout: 600000, // 10 minute timeout
		})
		console.log(`✅ Updated CONTEXT.md file: ${relativePath}`)
	} catch (error) {
		console.error(`❌ Failed to update CONTEXT.md: ${error}`)
		throw error
	}
}

/**
 * Recursively finds all CONTEXT.md files in the given directory and subdirectories
 */
async function findAllContextFiles(startPath: string): Promise<ContextFile[]> {
	const contextFiles: ContextFile[] = []

	async function walkDirectory(dirPath: string, depth = 0): Promise<void> {
		try {
			const entries = await fs.readdir(dirPath)

			for (const entry of entries) {
				const fullPath = path.join(dirPath, entry)
				const stats = await fs.stat(fullPath)

				if (stats.isDirectory()) {
					// Skip node_modules and other common ignore patterns
					if (!entry.startsWith('.') && entry !== 'node_modules') {
						await walkDirectory(fullPath, depth + 1)
					}
				} else if (entry === 'CONTEXT.md') {
					contextFiles.push({
						path: fullPath,
						depth: depth,
						dir: dirPath,
					})
				}
			}
		} catch {
			// Skip directories we can't read
		}
	}

	await walkDirectory(startPath)
	return contextFiles
}

/**
 * Groups files by depth for parallel processing
 */
function groupByDepth(files: ContextFile[]): Record<number, ContextFile[]> {
	const groups: Record<number, ContextFile[]> = {}
	for (const file of files) {
		if (!groups[file.depth]) {
			groups[file.depth] = []
		}
		groups[file.depth].push(file)
	}
	return groups
}

/**
 * Updates all CONTEXT.md files recursively, processing deepest first with parallel execution at each level
 */
async function updateContextFilesRecursively(startPath: string): Promise<void> {
	console.log(`Searching for CONTEXT.md files recursively in ${startPath}...`)

	// Find all CONTEXT.md files
	const allFiles = await findAllContextFiles(startPath)

	if (allFiles.length === 0) {
		console.log('No CONTEXT.md files found.')
		return
	}

	console.log(`Found ${allFiles.length} CONTEXT.md file(s):`)
	allFiles.forEach((file) => {
		console.log(`  - ${file.path} (depth: ${file.depth})`)
	})
	console.log()

	// Group by depth (deepest first)
	const groupsByDepth = groupByDepth(allFiles)
	const depths = Object.keys(groupsByDepth)
		.map(Number)
		.sort((a, b) => b - a) // Sort descending

	// Process each depth level in parallel
	for (const depth of depths) {
		const filesAtDepth = groupsByDepth[depth]
		console.log(`Processing ${filesAtDepth.length} file(s) at depth ${depth}...`)

		// Process all files at this depth in parallel
		const promises = filesAtDepth.map(async (file) => {
			console.log(`  Updating: ${file.path}`)
			await updateContextFile(file.path)
		})

		await Promise.all(promises)
		console.log(`Completed depth ${depth}\n`)
	}

	console.log('All CONTEXT.md files have been processed.')
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): ParsedOptions {
	const options: ParsedOptions = {
		update: false,
		recursive: false,
		verbose: false,
		path: process.cwd(),
	}

	for (let i = 0; i < args.length; i++) {
		const arg = args[i]
		if (arg === '--update' || arg === '-u') {
			options.update = true
		} else if (arg === '--recursive' || arg === '-r') {
			options.recursive = true
		} else if (arg === '--verbose' || arg === '-v') {
			options.verbose = true
		} else if (arg.startsWith('-') && arg.length > 2 && !arg.startsWith('--')) {
			// Handle combined flags like -ruv
			for (let j = 1; j < arg.length; j++) {
				const flag = arg[j]
				if (flag === 'u') {
					options.update = true
				} else if (flag === 'r') {
					options.recursive = true
				} else if (flag === 'v') {
					options.verbose = true
				} else if (flag === 'h') {
					// Handle help in combined flags
					console.log(`Usage: yarn context [options] [path]
			
Options:
  -v, --verbose   Show full CONTEXT.md content (default: just show path)
  -u, --update    Show diff and update CONTEXT.md based on main branch version
  -r, --recursive Process all CONTEXT.md files recursively (deepest first)
  -h, --help      Show this help message
  
Examples:
  yarn context                    # Show path to nearest CONTEXT.md from current directory
  yarn context -v                 # Show full content of nearest CONTEXT.md
  yarn context ./packages/editor # Show path to CONTEXT.md for specific path
  yarn context -v ./packages/editor # Show full content of CONTEXT.md for specific path
  yarn context -u                 # Update nearest CONTEXT.md based on main branch diff
  yarn context -r                 # Show paths of all CONTEXT.md files recursively
  yarn context -rv                # Show content of all CONTEXT.md files recursively
  yarn context -ru                # Update all CONTEXT.md files recursively`)
					process.exit(0)
				}
			}
		} else if (arg === '--help' || arg === '-h') {
			console.log(`Usage: yarn context [options] [path]
			
Options:
  -v, --verbose   Show full CONTEXT.md content (default: just show path)
  -u, --update    Show diff and update CONTEXT.md based on main branch version
  -r, --recursive Process all CONTEXT.md files recursively (deepest first)
  -h, --help      Show this help message
  
Examples:
  yarn context                    # Show path to nearest CONTEXT.md from current directory
  yarn context -v                 # Show full content of nearest CONTEXT.md
  yarn context ./packages/editor # Show path to CONTEXT.md for specific path
  yarn context -v ./packages/editor # Show full content of CONTEXT.md for specific path
  yarn context -u                 # Update nearest CONTEXT.md based on main branch diff
  yarn context -r                 # Show paths of all CONTEXT.md files recursively
  yarn context -rv                # Show content of all CONTEXT.md files recursively
  yarn context -ru                # Update all CONTEXT.md files recursively`)
			process.exit(0)
		} else if (!arg.startsWith('-')) {
			options.path = path.resolve(arg)
		}
	}

	return options
}

async function main(): Promise<void> {
	const args = process.argv.slice(2)
	const options = parseArgs(args)

	try {
		if (options.recursive) {
			// Recursive mode: process all CONTEXT.md files
			if (options.update) {
				await updateContextFilesRecursively(options.path)
			} else {
				// Just show all CONTEXT.md files found
				const allFiles = await findAllContextFiles(options.path)
				if (allFiles.length === 0) {
					console.log('No CONTEXT.md files found.')
					process.exit(1)
				}

				if (options.verbose) {
					console.log(`Found ${allFiles.length} CONTEXT.md file(s):`)
					for (const file of allFiles) {
						console.log(`\n--- ${file.path} ---`)
						try {
							const content = await fs.readFile(file.path, 'utf-8')
							console.log(content)
						} catch (error: any) {
							console.log(`Error reading file: ${error.message}`)
						}
					}
				} else {
					// Just show paths
					for (const file of allFiles) {
						console.log(file.path)
					}
				}
			}
		} else {
			// Single file mode: find nearest CONTEXT.md
			const result = await findNearestContext(options.path)

			if (result) {
				if (options.update) {
					await updateContextFile(result.path)
				} else if (options.verbose) {
					console.log(`Found CONTEXT.md at: ${result.path}\n`)
					console.log(result.content)
				} else {
					// Just show the path
					console.log(result.path)
				}
			} else {
				console.log('No CONTEXT.md file found in the directory tree.')
				process.exit(1)
			}
		}
	} catch (error: any) {
		console.error('Error:', error.message)
		process.exit(1)
	}
}

main()
