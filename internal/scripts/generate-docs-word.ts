#!/usr/bin/env tsx

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { nicelog } from './lib/nicelog'

const DOCS_DIR = resolve(dirname(dirname(dirname(__filename))), 'documentation')
const OUTPUT_FILE = resolve(DOCS_DIR, 'tldraw-documentation.md')

interface DocFile {
	path: string
	title: string
	content: string
}

interface Section {
	name: string
	files: string[]
}

// Document structure based on index.md organization
const SECTIONS: Section[] = [
	{
		name: 'Overview',
		files: [
			'overview/repository-overview.md',
			'overview/architecture-overview.md',
			'overview/getting-started.md',
		],
	},
	{
		name: 'Core SDK packages',
		files: [
			'packages/editor.md',
			'packages/tldraw.md',
			'packages/store.md',
			'packages/state.md',
			'packages/tlschema.md',
			'packages/validate.md',
		],
	},
	{
		name: 'Collaboration and sync',
		files: ['packages/sync.md', 'packages/sync-core.md', 'architecture/multiplayer.md'],
	},
	{
		name: 'Supporting packages',
		files: [
			'packages/utils.md',
			'packages/assets.md',
			'packages/state-react.md',
			'packages/dotcom-shared.md',
			'packages/worker-shared.md',
			'packages/create-tldraw.md',
		],
	},
	{
		name: 'Applications',
		files: ['apps/examples.md', 'apps/docs.md', 'apps/dotcom-client.md', 'apps/vscode.md'],
	},
	{
		name: 'Backend infrastructure',
		files: [
			'infrastructure/sync-worker.md',
			'infrastructure/asset-upload-worker.md',
			'infrastructure/image-resize-worker.md',
			'infrastructure/zero-cache.md',
			'infrastructure/fairy-worker.md',
		],
	},
	{
		name: 'Architecture deep dives',
		files: [
			'architecture/shape-system.md',
			'architecture/tool-system.md',
			'architecture/binding-system.md',
			'architecture/reactive-state.md',
			'architecture/store-records.md',
			'architecture/migrations.md',
			'architecture/style-system.md',
			'architecture/asset-pipeline.md',
			'architecture/ui-components.md',
		],
	},
	{
		name: 'Development guides',
		files: [
			'guides/custom-shapes.md',
			'guides/custom-tools.md',
			'guides/custom-bindings.md',
			'guides/ui-customization.md',
			'guides/testing.md',
			'guides/writing-examples.md',
		],
	},
	{
		name: 'Templates',
		files: [
			'templates/vite.md',
			'templates/nextjs.md',
			'templates/sync-cloudflare.md',
			'templates/workflow.md',
			'templates/branching-chat.md',
			'templates/agent.md',
		],
	},
	{
		name: 'Build system and tooling',
		files: [
			'tooling/lazyrepo.md',
			'tooling/yarn-workspaces.md',
			'tooling/typescript.md',
			'tooling/code-quality.md',
		],
	},
	{
		name: 'Reference',
		files: ['reference/commands.md', 'reference/api-conventions.md', 'reference/glossary.md'],
	},
	{
		name: 'Changelog',
		files: [], // Will be populated dynamically
	},
]

function parseFrontmatter(content: string): { title: string; body: string } {
	const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
	const match = content.match(frontmatterRegex)

	if (!match) {
		return { title: 'Untitled', body: content }
	}

	const frontmatter = match[1]
	const body = match[2]

	// Extract title from frontmatter
	const titleMatch = frontmatter.match(/^title:\s*['"]?(.+?)['"]?\s*$/m)
	const title = titleMatch ? titleMatch[1] : 'Untitled'

	return { title, body }
}

function bumpHeadings(content: string): string {
	// Bump all headings down one level (## becomes ###, etc.)
	return content.replace(/^(#{1,5})\s/gm, (match, hashes) => {
		return '#' + hashes + ' '
	})
}

function resolveInternalLinks(content: string, currentFile: string): string {
	// Convert relative links to just text (since they won't work in Word)
	// Keep the link text, remove the link syntax
	return content.replace(/\[([^\]]+)\]\(\.\/[^)]+\.md\)/g, '$1')
}

function readDocFile(relativePath: string): DocFile | null {
	const fullPath = resolve(DOCS_DIR, relativePath)

	if (!existsSync(fullPath)) {
		nicelog(`⚠️  File not found: ${relativePath}`)
		return null
	}

	const rawContent = readFileSync(fullPath, 'utf-8')
	const { title, body } = parseFrontmatter(rawContent)

	// Process the content
	let processedContent = body.trim()
	processedContent = bumpHeadings(processedContent)
	processedContent = resolveInternalLinks(processedContent, relativePath)

	return {
		path: relativePath,
		title,
		content: processedContent,
	}
}

function getChangelogFiles(): string[] {
	const changelogDir = resolve(DOCS_DIR, 'changelog')
	const { readdirSync } = require('fs')

	if (!existsSync(changelogDir)) {
		return []
	}

	const files = readdirSync(changelogDir) as string[]
	return files
		.filter((f: string) => f.endsWith('.md') && f !== 'index.md' && f !== 'next.md')
		.sort((a: string, b: string) => {
			// Sort by version number descending (v4.2.md comes before v4.1.md)
			const versionA = a.replace('.md', '').replace('v', '')
			const versionB = b.replace('.md', '').replace('v', '')
			const partsA = versionA.split('.').map(Number)
			const partsB = versionB.split('.').map(Number)

			for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
				const numA = partsA[i] || 0
				const numB = partsB[i] || 0
				if (numA !== numB) return numB - numA
			}
			return 0
		})
		.map((f: string) => `changelog/${f}`)
}

function generateCoverPage(): string {
	const today = new Date()
	const dateStr = today.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	})

	return `---
title: tldraw Documentation
---

# tldraw Documentation

## Complete SDK and platform reference

**Generated:** ${dateStr}

**Version:** Based on tldraw monorepo

---

This document contains the complete documentation for the tldraw infinite canvas SDK, including:

- Core SDK packages and architecture
- Collaboration and synchronization
- Backend infrastructure
- Development guides and tutorials
- Templates and examples
- Build system and tooling
- Complete changelog history

---

\`\`\`{=openxml}
<w:p><w:r><w:br w:type="page"/></w:r></w:p>
\`\`\`

`
}

function main() {
	nicelog('📚 Generating consolidated documentation...')
	nicelog(`   Source: ${DOCS_DIR}`)
	nicelog(`   Output: ${OUTPUT_FILE}`)

	// Populate changelog files
	const changelogSection = SECTIONS.find((s) => s.name === 'Changelog')
	if (changelogSection) {
		changelogSection.files = getChangelogFiles()
		nicelog(`   Found ${changelogSection.files.length} changelog files`)
	}

	const outputParts: string[] = []

	// Add cover page
	outputParts.push(generateCoverPage())

	// Process each section
	let totalFiles = 0
	let processedFiles = 0

	for (const section of SECTIONS) {
		if (section.files.length === 0) continue

		nicelog(`\n📁 Processing: ${section.name}`)
		outputParts.push(`# ${section.name}\n\n`)

		for (const filePath of section.files) {
			totalFiles++
			const doc = readDocFile(filePath)

			if (doc) {
				processedFiles++
				nicelog(`   ✓ ${doc.title}`)

				outputParts.push(`## ${doc.title}\n\n`)
				outputParts.push(doc.content)
				outputParts.push('\n\n---\n\n')
			}
		}
	}

	// Write output
	const finalContent = outputParts.join('')
	writeFileSync(OUTPUT_FILE, finalContent, 'utf-8')

	nicelog(`\n✅ Generated: ${OUTPUT_FILE}`)
	nicelog(`   Processed ${processedFiles}/${totalFiles} files`)
	nicelog(`   Total size: ${(finalContent.length / 1024).toFixed(1)} KB`)

	nicelog('\n📝 To generate Word document, run:')
	nicelog(
		`   pandoc "${OUTPUT_FILE}" -o "${OUTPUT_FILE.replace('.md', '.docx')}" --toc --toc-depth=3`
	)
}

main()
