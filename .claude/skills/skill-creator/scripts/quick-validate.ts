#!/usr/bin/env npx tsx
/**
 * Quick validation script for skills - minimal version
 */

import * as fs from 'fs'
import * as path from 'path'

interface ValidationResult {
	valid: boolean
	message: string
}

const ALLOWED_PROPERTIES = new Set(['name', 'description', 'license', 'allowed-tools', 'metadata'])

function parseSimpleYaml(text: string): Record<string, string> {
	const result: Record<string, string> = {}
	for (const line of text.split('\n')) {
		const match = line.match(/^(\S+):\s*(.*)$/)
		if (match) {
			const [, key, value] = match
			result[key] = value.trim()
		}
	}
	return result
}

export function validateSkill(skillPath: string): ValidationResult {
	const skillMdPath = path.join(skillPath, 'SKILL.md')

	// Check SKILL.md exists
	if (!fs.existsSync(skillMdPath)) {
		return { valid: false, message: 'SKILL.md not found' }
	}

	// Read and validate frontmatter
	const content = fs.readFileSync(skillMdPath, 'utf-8')
	if (!content.startsWith('---')) {
		return { valid: false, message: 'No YAML frontmatter found' }
	}

	// Extract frontmatter (handle both LF and CRLF line endings)
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)
	if (!match) {
		return { valid: false, message: 'Invalid frontmatter format' }
	}

	const frontmatterText = match[1]
	const frontmatter = parseSimpleYaml(frontmatterText)

	// Check for unexpected properties
	const unexpectedKeys = Object.keys(frontmatter).filter((k) => !ALLOWED_PROPERTIES.has(k))
	if (unexpectedKeys.length > 0) {
		return {
			valid: false,
			message: `Unexpected key(s) in SKILL.md frontmatter: ${unexpectedKeys.sort().join(', ')}. Allowed properties are: ${[...ALLOWED_PROPERTIES].sort().join(', ')}`,
		}
	}

	// Check required fields
	if (!frontmatter.name) {
		return { valid: false, message: "Missing 'name' in frontmatter" }
	}
	if (!frontmatter.description) {
		return { valid: false, message: "Missing 'description' in frontmatter" }
	}

	// Validate name
	const name = frontmatter.name.trim()
	if (!name) {
		return { valid: false, message: 'Name cannot be empty or whitespace-only' }
	}
	{
		if (!/^[a-z0-9-]+$/.test(name)) {
			return {
				valid: false,
				message: `Name '${name}' should be hyphen-case (lowercase letters, digits, and hyphens only)`,
			}
		}
		if (name.startsWith('-') || name.endsWith('-') || name.includes('--')) {
			return {
				valid: false,
				message: `Name '${name}' cannot start/end with hyphen or contain consecutive hyphens`,
			}
		}
		if (name.length > 64) {
			return {
				valid: false,
				message: `Name is too long (${name.length} characters). Maximum is 64 characters.`,
			}
		}
	}

	// Validate description
	const description = frontmatter.description.trim()
	if (!description) {
		return { valid: false, message: 'Description cannot be empty or whitespace-only' }
	}
	{
		if (description.includes('<') || description.includes('>')) {
			return { valid: false, message: 'Description cannot contain angle brackets (< or >)' }
		}
		if (description.length > 1024) {
			return {
				valid: false,
				message: `Description is too long (${description.length} characters). Maximum is 1024 characters.`,
			}
		}
	}

	return { valid: true, message: 'Skill is valid!' }
}

// CLI entry point
if (require.main === module) {
	const args = process.argv.slice(2)
	if (args.length !== 1) {
		console.log('Usage: npx tsx quick-validate.ts <skill_directory>')
		process.exit(1)
	}

	const { valid, message } = validateSkill(args[0])
	console.log(message)
	process.exit(valid ? 0 : 1)
}
