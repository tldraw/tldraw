#!/usr/bin/env npx tsx
/**
 * Skill Packager - Creates a distributable .skill file of a skill folder
 *
 * Usage:
 *   npx tsx package-skill.ts <path/to/skill-folder> [output-directory]
 *
 * Example:
 *   npx tsx package-skill.ts .claude/skills/my-skill
 *   npx tsx package-skill.ts .claude/skills/my-skill ./dist
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { validateSkill } from './quick-validate'

function getAllFiles(dir: string, baseDir: string = dir): string[] {
	const files: string[] = []
	const entries = fs.readdirSync(dir, { withFileTypes: true })

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			files.push(...getAllFiles(fullPath, baseDir))
		} else {
			files.push(fullPath)
		}
	}

	return files
}

function packageSkill(skillPath: string, outputDir?: string): string | null {
	const resolvedSkillPath = path.resolve(skillPath)

	// Validate skill folder exists
	if (!fs.existsSync(resolvedSkillPath)) {
		console.log(`❌ Error: Skill folder not found: ${resolvedSkillPath}`)
		return null
	}

	if (!fs.statSync(resolvedSkillPath).isDirectory()) {
		console.log(`❌ Error: Path is not a directory: ${resolvedSkillPath}`)
		return null
	}

	// Validate SKILL.md exists
	const skillMdPath = path.join(resolvedSkillPath, 'SKILL.md')
	if (!fs.existsSync(skillMdPath)) {
		console.log(`❌ Error: SKILL.md not found in ${resolvedSkillPath}`)
		return null
	}

	// Run validation before packaging
	console.log('🔍 Validating skill...')
	const { valid, message } = validateSkill(resolvedSkillPath)
	if (!valid) {
		console.log(`❌ Validation failed: ${message}`)
		console.log('   Please fix the validation errors before packaging.')
		return null
	}
	console.log(`✅ ${message}\n`)

	// Determine output location
	const skillName = path.basename(resolvedSkillPath)

	// Validate directory name is safe for shell commands (same rules as skill names)
	if (!/^[a-z0-9-]+$/.test(skillName)) {
		console.log(
			`❌ Error: Directory name '${skillName}' contains unsafe characters. Use only lowercase letters, digits, and hyphens.`
		)
		return null
	}

	const resolvedOutputDir = outputDir ? path.resolve(outputDir) : process.cwd()

	if (!fs.existsSync(resolvedOutputDir)) {
		fs.mkdirSync(resolvedOutputDir, { recursive: true })
	}

	const skillFilename = path.join(resolvedOutputDir, `${skillName}.skill`)

	let tempDir: string | null = null
	try {
		// Get all files in the skill directory
		const files = getAllFiles(resolvedSkillPath)

		// Create a temporary directory for the zip structure (cross-platform)
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skill-package-'))
		const tempSkillDir = path.join(tempDir, skillName)
		fs.mkdirSync(tempSkillDir, { recursive: true })

		// Copy all files maintaining structure
		for (const file of files) {
			const relativePath = path.relative(resolvedSkillPath, file)
			const destPath = path.join(tempSkillDir, relativePath)
			const destDir = path.dirname(destPath)

			if (!fs.existsSync(destDir)) {
				fs.mkdirSync(destDir, { recursive: true })
			}

			fs.copyFileSync(file, destPath)
			console.log(`  Added: ${skillName}/${relativePath}`)
		}

		// Create zip file using system zip command
		const zipPath = path.resolve(skillFilename)
		execSync(`cd "${tempDir}" && zip -r "${zipPath}" "${skillName}"`, { stdio: 'pipe' })

		// Cleanup temp directory
		fs.rmSync(tempDir, { recursive: true })

		console.log(`\n✅ Successfully packaged skill to: ${skillFilename}`)
		return skillFilename
	} catch (err) {
		// Cleanup temp directory on error
		if (tempDir && fs.existsSync(tempDir)) {
			try {
				fs.rmSync(tempDir, { recursive: true })
			} catch {
				// Ignore cleanup errors
			}
		}
		console.log(`❌ Error creating .skill file: ${err}`)
		return null
	}
}

// CLI entry point
const args = process.argv.slice(2)
if (args.length < 1) {
	console.log('Usage: npx tsx package-skill.ts <path/to/skill-folder> [output-directory]')
	console.log('\nExample:')
	console.log('  npx tsx package-skill.ts .claude/skills/my-skill')
	console.log('  npx tsx package-skill.ts .claude/skills/my-skill ./dist')
	process.exit(1)
}

const skillPath = args[0]
const outputDir = args[1]

console.log(`📦 Packaging skill: ${skillPath}`)
if (outputDir) {
	console.log(`   Output directory: ${outputDir}`)
}
console.log()

const result = packageSkill(skillPath, outputDir)
process.exit(result ? 0 : 1)
