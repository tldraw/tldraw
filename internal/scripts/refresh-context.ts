#!/usr/bin/env tsx

import { execSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { basename, dirname, relative, resolve } from 'path'
import { nicelog } from './lib/nicelog'

interface ContextReviewResult {
	file: string
	status: 'valid' | 'needs_update' | 'error' | 'updated'
	issues: string[]
	suggestions: string[]
	updatedContent?: string
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
               If not provided, reviews all packages/ directories

Examples:
  yarn refresh-context                    # Review all packages
  yarn refresh-context ./packages/tldraw # Review specific package
  yarn refresh-context --help            # Show this help
`)
		process.exit(0)
	}

	let targetPath: string

	if (args.length === 0) {
		// Default: review all CONTEXT.md files in packages/
		targetPath = resolve(process.cwd(), 'packages')
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
		contextFiles = glob.sync('**/CONTEXT.md', {
			cwd: targetPath,
			absolute: true,
		})
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

	// Read the context file
	let contextContent: string
	try {
		contextContent = readFileSync(contextFile, 'utf-8')
	} catch (error) {
		return {
			file: contextFile,
			status: 'error',
			issues: [`Cannot read file: ${error}`],
			suggestions: [],
		}
	}

	// Package.json is available but not needed for the current implementation

	// First, check if updates are needed
	const reviewPrompt = `Review this CONTEXT.md file for "${packageName}" package. Respond only with JSON:

CONTEXT.md:
\`\`\`
${contextContent.length > 8000 ? contextContent.substring(0, 8000) + '...[truncated]' : contextContent}
\`\`\`

Return JSON with:
- "status": "valid" | "needs_update" | "error"
- "issues": string[] (problems found)  
- "suggestions": string[] (improvements)

Check accuracy, completeness, structure, and code examples.`

	try {
		// Use Claude Code CLI to review the file
		const claudeResult = execSync('claude --print', {
			input: reviewPrompt,
			cwd: packageDir,
			encoding: 'utf-8',
			timeout: 60000, // 60 second timeout
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
			const updatePrompt = `Please update this CONTEXT.md file for the "${packageName}" package to fix the issues found:

Issues to fix:
${reviewResult.issues.map((issue: string) => `- ${issue}`).join('\n')}

Suggestions to implement:
${reviewResult.suggestions.map((suggestion: string) => `- ${suggestion}`).join('\n')}

Current CONTEXT.md:
\`\`\`markdown
${contextContent}
\`\`\`

Please provide the complete updated CONTEXT.md file. Respond with only the updated markdown content, no additional text or formatting.`

			try {
				const updateResult = execSync('claude --print', {
					input: updatePrompt,
					cwd: packageDir,
					encoding: 'utf-8',
					timeout: 120000, // 2 minute timeout for updates
				})

				// Write the updated content
				writeFileSync(contextFile, updateResult.trim(), 'utf-8')

				return {
					file: contextFile,
					status: 'updated' as const,
					issues: reviewResult.issues || [],
					suggestions: reviewResult.suggestions || [],
					updatedContent: updateResult.trim(),
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
