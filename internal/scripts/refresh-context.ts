#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { glob } from 'glob'
import { basename, dirname, relative, resolve } from 'path'
import { nicelog } from './lib/nicelog'

interface ContextReviewResult {
	file: string
	status: 'valid' | 'needs_update' | 'error' | 'updated'
	issues: string[]
	suggestions: string[]
}

async function main() {
	const args = process.argv.slice(2)

	// Handle help flag
	if (args.includes('--help') || args.includes('-h')) {
		console.log(`
Usage: yarn refresh-context [directory]

Review CONTEXT.md files for accuracy and completeness using Claude Code CLI.

Arguments:
  directory    Path to directory containing CONTEXT.md file(s) (optional)
               If not provided, reviews all packages/ directories and root CONTEXT.md

Examples:
  yarn refresh-context                    # Review all packages and root CONTEXT.md
  yarn refresh-context ./packages/tldraw # Review specific package
  yarn refresh-context .                 # Review root CONTEXT.md only
  yarn refresh-context --help            # Show this help
`)
		process.exit(0)
	}

	let targetPath: string

	if (args.length === 0) {
		// Default: review all CONTEXT.md files in packages/ and root
		targetPath = process.cwd() // Start from root to find all CONTEXT.md files
	} else {
		// Use provided directory argument
		targetPath = resolve(process.cwd(), args[0])
	}

	nicelog(`🔍 Reviewing CONTEXT.md files in: ${relative(process.cwd(), targetPath)}`)

	let contextFiles: string[]

	if (existsSync(resolve(targetPath, 'CONTEXT.md'))) {
		// Single file mode
		contextFiles = [resolve(targetPath, 'CONTEXT.md')]
	} else {
		// Directory mode - find all CONTEXT.md files
		if (args.length === 0) {
			// Default mode: find packages and root CONTEXT.md files
			contextFiles = glob.sync('{packages/**/CONTEXT.md,CONTEXT.md}', {
				cwd: targetPath,
				absolute: true,
			})
		} else {
			// Specific directory mode
			contextFiles = glob.sync('**/CONTEXT.md', {
				cwd: targetPath,
				absolute: true,
			})
		}
	}

	if (contextFiles.length === 0) {
		nicelog(`❌ No CONTEXT.md files found`)
		process.exit(1)
	}

	nicelog(`📁 Found ${contextFiles.length} CONTEXT.md file(s)`)

	const results: ContextReviewResult[] = []

	for (const contextFile of contextFiles) {
		nicelog(`\n📄 Reviewing: ${relative(process.cwd(), contextFile)}`)

		try {
			const result = await reviewContextFile(contextFile)
			results.push(result)

			// Display immediate feedback
			if (result.status === 'valid') {
				nicelog(`   ✅ Valid`)
			} else if (result.status === 'updated') {
				nicelog(`   🔄 Updated`)
			} else if (result.status === 'needs_update') {
				nicelog(`   ⚠️  Needs updates (${result.issues.length} issues)`)
				result.issues.forEach((issue) => nicelog(`      • ${issue}`))
			} else {
				nicelog(`   ❌ Error: ${result.issues[0]}`)
			}

			if (result.suggestions.length > 0) {
				nicelog(`   💡 Suggestions:`)
				result.suggestions.forEach((suggestion) => nicelog(`      • ${suggestion}`))
			}
		} catch (error) {
			nicelog(`   ❌ Failed to review: ${error}`)
			results.push({
				file: contextFile,
				status: 'error',
				issues: [`Failed to process: ${error}`],
				suggestions: [],
			})
		}
	}

	// Summary
	const valid = results.filter((r) => r.status === 'valid').length
	const updated = results.filter((r) => r.status === 'updated').length
	const needsUpdate = results.filter((r) => r.status === 'needs_update').length
	const errors = results.filter((r) => r.status === 'error').length

	nicelog(`\n📊 Summary:`)
	nicelog(`   ✅ Valid: ${valid}`)
	nicelog(`   🔄 Updated: ${updated}`)
	nicelog(`   ⚠️  Needs updates: ${needsUpdate}`)
	nicelog(`   ❌ Errors: ${errors}`)

	if (needsUpdate > 0 || errors > 0) {
		process.exit(1)
	} else {
		nicelog(`\n🎉 All CONTEXT.md files are up to date!`)
	}
}

async function reviewContextFile(contextFile: string): Promise<ContextReviewResult> {
	const packageDir = dirname(contextFile)
	const packageName = basename(packageDir)
	const isRootContext = basename(contextFile) === 'CONTEXT.md' && packageDir === process.cwd()

	// Verify the context file exists
	if (!existsSync(contextFile)) {
		return {
			file: contextFile,
			status: 'error',
			issues: ['CONTEXT.md file does not exist'],
			suggestions: [],
		}
	}

	// First, check if updates are needed - focus only on critical accuracy issues
	const contextDescription = isRootContext
		? 'This is the root CONTEXT.md file for the entire tldraw monorepo. The CONTEXT.md file helps language models understand the overall codebase architecture and structure.'
		: `This is the "${packageName}" package. The CONTEXT.md file helps language models understand the codebase.`

	const expectedStructureGuidance = isRootContext
		? `

For the ROOT CONTEXT.md file, it should include these essential sections:
- Repository Overview with purpose
- Essential Commands (development, building, testing, code quality)
- Testing Patterns (Vitest and Playwright guidance)
- Development Workspace Structure (visual directory tree)
- High-Level Architecture (core packages and patterns)
- Key Development Notes (TypeScript, monorepo management, asset workflow)
- Development Patterns (creating components, integration guidance)

The root CONTEXT.md should provide both comprehensive architectural understanding and actionable workflow guidance for AI agents working in the codebase.`
		: `

For PACKAGE CONTEXT.md files, they should include:
- Package overview and purpose
- Architecture and key concepts specific to this package
- API patterns and usage examples
- Integration points with other packages
- Development patterns specific to this package`

	const reviewPrompt = `Our repository uses CONTEXT.md files to help language models and agents quickly understand the codebase. We periodically check these files to ensure that they are accurate, free of omissions, and comprehensive. 
	
${contextDescription}${expectedStructureGuidance}

Please read the CONTEXT.md file in this directory and review it for CRITICAL ACCURACY issues only.

ONLY flag issues if they are:
1. **Factually incorrect code examples** that won't work
2. **Missing critical concepts** that are essential for understanding this ${isRootContext ? 'monorepo' : 'package'}
3. **Outdated API references** to functions/classes that no longer exist
4. **Wrong architectural descriptions** that misrepresent how the ${isRootContext ? 'monorepo' : 'package'} works
5. **Missing key exports** that developers would need to know about${isRootContext ? '\n6. **Missing essential sections** from the expected structure above that are critical for AI agent productivity' : ''}

DO NOT flag:
- Style/formatting preferences
- Minor wording improvements  
- Suggestions for "more examples"
- Completeness of documentation (unless truly essential concepts are missing)
- Truncated content at the end of files

Feel free to read other files in this directory (or others, if needed) to verify accuracy (package.json, source files, etc.)

Respond only with JSON:
- "status": "valid" | "needs_update" | "error"
- "issues": string[] (only critical factual problems)  
- "suggestions": string[] (only critical missing concepts)

Be very conservative - only flag issues that would genuinely mislead a developer or agent trying to understand or use this ${isRootContext ? 'monorepo' : 'package'}, such as: missing key exports, outdated API references, or factually wrong architectural descriptions.`

	try {
		// Use Claude Code CLI to review the file
		const claudeResult = execSync('claude --print', {
			input: reviewPrompt,
			cwd: packageDir,
			encoding: 'utf-8',
			timeout: 300000, // 5 minute timeout for review
		})

		// Try to parse Claude's response as JSON
		let reviewResult: any
		try {
			// Extract JSON from Claude's response (may contain other text)
			const jsonMatch = claudeResult.match(/\{[\s\S]*\}/)
			if (jsonMatch) {
				reviewResult = JSON.parse(jsonMatch[0])
			} else {
				throw new Error('No JSON found in response')
			}
		} catch (_parseError) {
			// Fallback: parse the response manually
			reviewResult = parseClaudeResponse(claudeResult)
		}

		// If needs update, generate the updated content
		if (reviewResult.status === 'needs_update') {
			const updateTarget = isRootContext
				? 'the tldraw monorepo root'
				: `the "${packageName}" package`

			const structuralGuidance = isRootContext
				? `

When updating the ROOT CONTEXT.md file, ensure it includes these essential sections:
- Repository Overview with purpose
- Essential Commands (development, building, testing, code quality)
- Testing Patterns (Vitest and Playwright guidance)
- Development Workspace Structure (visual directory tree)
- High-Level Architecture (core packages and patterns) 
- Key Development Notes (TypeScript, monorepo management, asset workflow)
- Development Patterns (creating components, integration guidance)

The root CONTEXT.md should provide both comprehensive architectural understanding and actionable workflow guidance for AI agents.`
				: `

When updating PACKAGE CONTEXT.md files, ensure they include:
- Package overview and purpose
- Architecture and key concepts specific to this package
- API patterns and usage examples
- Integration points with other packages
- Development patterns specific to this package`

			const updatePrompt = `Please read the CONTEXT.md file in this directory and fix ONLY the critical accuracy issues for ${updateTarget}:

Critical issues to fix:
${reviewResult.issues.map((issue: string) => `- ${issue}`).join('\n')}

Critical missing concepts to add:
${reviewResult.suggestions.map((suggestion: string) => `- ${suggestion}`).join('\n')}${structuralGuidance}

Feel free to read other files in this directory to verify correct information (package.json, source files, etc.)

IMPORTANT: Make MINIMAL changes. Only fix factual errors, update outdated APIs, and add truly essential missing concepts. Do not:
- Rewrite sections for style
- Add minor improvements  
- Change formatting (no markdown code fences, etc.)
- Add "nice to have" examples
- Fix typos or grammar unless they cause confusion
- Add completeness improvements unless they are critical missing sections

PRESERVE the original formatting, structure, and style exactly. Only change the specific factual errors mentioned in the issues.

Please write the complete updated CONTEXT.md file with only the necessary critical fixes.`

			try {
				execSync('claude', {
					input: updatePrompt,
					cwd: packageDir,
					encoding: 'utf-8',
					timeout: 600000, // 10 minute timeout for updates
				})

				return {
					file: contextFile,
					status: 'updated' as const,
					issues: reviewResult.issues || [],
					suggestions: reviewResult.suggestions || [],
				}
			} catch (_updateError) {
				// If update fails, fall back to needs_update status
				return {
					file: contextFile,
					status: reviewResult.status || 'error',
					issues: Array.isArray(reviewResult.issues) ? reviewResult.issues : [],
					suggestions: Array.isArray(reviewResult.suggestions) ? reviewResult.suggestions : [],
				}
			}
		}

		return {
			file: contextFile,
			status: reviewResult.status || 'error',
			issues: Array.isArray(reviewResult.issues) ? reviewResult.issues : [],
			suggestions: Array.isArray(reviewResult.suggestions) ? reviewResult.suggestions : [],
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error('Claude CLI Error Details:', error)
		return {
			file: contextFile,
			status: 'error',
			issues: [`Claude Code CLI error: ${errorMessage}`],
			suggestions: ['Ensure Claude Code CLI is installed and accessible'],
		}
	}
}

function parseClaudeResponse(response: string): {
	status: string
	issues: string[]
	suggestions: string[]
} {
	// Fallback parsing if JSON extraction fails
	const lines = response.toLowerCase()

	let status = 'valid'
	if (lines.includes('needs update') || lines.includes('outdated') || lines.includes('incorrect')) {
		status = 'needs_update'
	}
	if (lines.includes('error') || lines.includes('invalid') || lines.includes('broken')) {
		status = 'error'
	}

	// Extract issues and suggestions from text
	const issues: string[] = []
	const suggestions: string[] = []

	const responseLines = response.split('\n')
	let currentSection = ''

	for (const line of responseLines) {
		const trimmed = line.trim()
		if (trimmed.toLowerCase().includes('issues:') || trimmed.toLowerCase().includes('problems:')) {
			currentSection = 'issues'
		} else if (
			trimmed.toLowerCase().includes('suggestions:') ||
			trimmed.toLowerCase().includes('recommendations:')
		) {
			currentSection = 'suggestions'
		} else if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
			const item = trimmed.substring(2)
			if (currentSection === 'issues') {
				issues.push(item)
			} else if (currentSection === 'suggestions') {
				suggestions.push(item)
			}
		}
	}

	return { status, issues, suggestions }
}

main().catch((error) => {
	nicelog(`❌ Script failed: ${error}`)
	process.exit(1)
})
