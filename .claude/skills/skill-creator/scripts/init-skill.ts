#!/usr/bin/env npx tsx
/**
 * Skill Initializer - Creates a new skill from template
 *
 * Usage:
 *   npx tsx init-skill.ts <skill-name> --path <path>
 *
 * Examples:
 *   npx tsx init-skill.ts my-new-skill --path skills/public
 *   npx tsx init-skill.ts my-api-helper --path skills/private
 */

import * as fs from 'fs'
import * as path from 'path'

const SKILL_TEMPLATE = `---
name: {{skill_name}}
description: [TODO: Complete and informative explanation of what the skill does and when to use it. Include WHEN to use this skill - specific scenarios, file types, or tasks that trigger it.]
---

# {{skill_title}}

## Overview

[TODO: 1-2 sentences explaining what this skill enables]

## Structuring This Skill

[TODO: Choose the structure that best fits this skill's purpose. Common patterns:

**1. Workflow-Based** (best for sequential processes)
- Works well when there are clear step-by-step procedures
- Example: DOCX skill with "Workflow Decision Tree" → "Reading" → "Creating" → "Editing"
- Structure: ## Overview → ## Workflow Decision Tree → ## Step 1 → ## Step 2...

**2. Task-Based** (best for tool collections)
- Works well when the skill offers different operations/capabilities
- Example: PDF skill with "Quick Start" → "Merge PDFs" → "Split PDFs" → "Extract Text"
- Structure: ## Overview → ## Quick Start → ## Task Category 1 → ## Task Category 2...

**3. Reference/Guidelines** (best for standards or specifications)
- Works well for brand guidelines, coding standards, or requirements
- Example: Brand styling with "Brand Guidelines" → "Colors" → "Typography" → "Features"
- Structure: ## Overview → ## Guidelines → ## Specifications → ## Usage...

**4. Capabilities-Based** (best for integrated systems)
- Works well when the skill provides multiple interrelated features
- Example: Product Management with "Core Capabilities" → numbered capability list
- Structure: ## Overview → ## Core Capabilities → ### 1. Feature → ### 2. Feature...

Patterns can be mixed and matched as needed. Most skills combine patterns (e.g., start with task-based, add workflow for complex operations).

Delete this entire "Structuring This Skill" section when done - it's just guidance.]

## [TODO: Replace with the first main section based on chosen structure]

[TODO: Add content here. See examples in existing skills:
- Code samples for technical skills
- Decision trees for complex workflows
- Concrete examples with realistic user requests
- References to scripts/templates/references as needed]

## Resources

This skill includes example resource directories that demonstrate how to organize different types of bundled resources:

### scripts/
Executable code (TypeScript/Python/Bash/etc.) that can be run directly to perform specific operations.

### references/
Documentation and reference material intended to be loaded into context to inform Claude's process and thinking.

### assets/
Files not intended to be loaded into context, but rather used within the output Claude produces.

---

**Any unneeded directories can be deleted.** Not every skill requires all three types of resources.
`

const EXAMPLE_SCRIPT = `#!/usr/bin/env npx tsx
/**
 * Example helper script for {{skill_name}}
 *
 * This is a placeholder script that can be executed directly.
 * Replace with actual implementation or delete if not needed.
 */

function main() {
  console.log('This is an example script for {{skill_name}}')
  // TODO: Add actual script logic here
}

main()
`

const EXAMPLE_REFERENCE = `# Reference Documentation for {{skill_title}}

This is a placeholder for detailed reference documentation.
Replace with actual reference content or delete if not needed.

## When Reference Docs Are Useful

Reference docs are ideal for:
- Comprehensive API documentation
- Detailed workflow guides
- Complex multi-step processes
- Information too lengthy for main SKILL.md
- Content that's only needed for specific use cases
`

const EXAMPLE_ASSET = `# Example Asset File

This placeholder represents where asset files would be stored.
Replace with actual asset files (templates, images, fonts, etc.) or delete if not needed.

Asset files are NOT intended to be loaded into context, but rather used within
the output Claude produces.

## Common Asset Types

- Templates: .pptx, .docx, boilerplate directories
- Images: .png, .jpg, .svg, .gif
- Fonts: .ttf, .otf, .woff, .woff2
- Boilerplate code: Project directories, starter files
`

function titleCase(skillName: string): string {
	return skillName
		.split('-')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

function fillTemplate(template: string, skillName: string, skillTitle: string): string {
	return template
		.replace(/\{\{skill_name\}\}/g, skillName)
		.replace(/\{\{skill_title\}\}/g, skillTitle)
}

function validateSkillName(skillName: string): string | null {
	// Check for valid hyphen-case format
	if (!/^[a-z0-9-]+$/.test(skillName)) {
		return `Name '${skillName}' should be hyphen-case (lowercase letters, digits, and hyphens only)`
	}
	if (skillName.startsWith('-') || skillName.endsWith('-') || skillName.includes('--')) {
		return `Name '${skillName}' cannot start/end with hyphen or contain consecutive hyphens`
	}
	if (skillName.length > 64) {
		return `Name is too long (${skillName.length} characters). Maximum is 64 characters.`
	}
	return null
}

function initSkill(skillName: string, basePath: string): string | null {
	// Validate skill name format
	const nameError = validateSkillName(skillName)
	if (nameError) {
		console.log(`❌ Error: ${nameError}`)
		return null
	}

	const skillDir = path.resolve(basePath, skillName)

	// Check if directory already exists
	if (fs.existsSync(skillDir)) {
		console.log(`❌ Error: Skill directory already exists: ${skillDir}`)
		return null
	}

	const skillTitle = titleCase(skillName)

	let dirCreated = false
	try {
		// Create skill directory
		fs.mkdirSync(skillDir, { recursive: true })
		dirCreated = true
		console.log(`✅ Created skill directory: ${skillDir}`)

		// Create SKILL.md
		const skillContent = fillTemplate(SKILL_TEMPLATE, skillName, skillTitle)
		fs.writeFileSync(path.join(skillDir, 'SKILL.md'), skillContent)
		console.log('✅ Created SKILL.md')

		// Create scripts/ directory with example
		const scriptsDir = path.join(skillDir, 'scripts')
		fs.mkdirSync(scriptsDir)
		fs.writeFileSync(
			path.join(scriptsDir, 'example.ts'),
			fillTemplate(EXAMPLE_SCRIPT, skillName, skillTitle)
		)
		console.log('✅ Created scripts/example.ts')

		// Create references/ directory with example
		const referencesDir = path.join(skillDir, 'references')
		fs.mkdirSync(referencesDir)
		fs.writeFileSync(
			path.join(referencesDir, 'api-reference.md'),
			fillTemplate(EXAMPLE_REFERENCE, skillName, skillTitle)
		)
		console.log('✅ Created references/api-reference.md')

		// Create assets/ directory with example
		const assetsDir = path.join(skillDir, 'assets')
		fs.mkdirSync(assetsDir)
		fs.writeFileSync(
			path.join(assetsDir, 'example-asset.txt'),
			fillTemplate(EXAMPLE_ASSET, skillName, skillTitle)
		)
		console.log('✅ Created assets/example-asset.txt')

		console.log(`\n✅ Skill '${skillName}' initialized successfully at ${skillDir}`)
		console.log('\nNext steps:')
		console.log('1. Edit SKILL.md to complete the TODO items and update the description')
		console.log('2. Customize or delete the example files in scripts/, references/, and assets/')
		console.log('3. Run the validator when ready to check the skill structure')

		return skillDir
	} catch (err) {
		// Clean up partially created directory on failure
		if (dirCreated && fs.existsSync(skillDir)) {
			try {
				fs.rmSync(skillDir, { recursive: true })
				console.log(`🧹 Cleaned up partial directory: ${skillDir}`)
			} catch {
				// Ignore cleanup errors
			}
		}
		console.log(`❌ Error: ${err}`)
		return null
	}
}

// CLI entry point
const args = process.argv.slice(2)
if (args.length < 3 || args[1] !== '--path') {
	console.log('Usage: npx tsx init-skill.ts <skill-name> --path <path>')
	console.log('\nSkill name requirements:')
	console.log("  - Hyphen-case identifier (e.g., 'data-analyzer')")
	console.log('  - Lowercase letters, digits, and hyphens only')
	console.log('  - Max 40 characters')
	console.log('\nExamples:')
	console.log('  npx tsx init-skill.ts my-new-skill --path .claude/skills')
	process.exit(1)
}

const skillName = args[0]
const basePath = args[2]

console.log(`🚀 Initializing skill: ${skillName}`)
console.log(`   Location: ${basePath}`)
console.log()

const result = initSkill(skillName, basePath)
process.exit(result ? 0 : 1)
