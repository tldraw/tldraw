#!/usr/bin/env tsx

/**
 * Post-processes a Word document to apply custom styling:
 * - Times New Roman for all prose (11pt)
 * - Consolas for all code (9pt)
 * - Tighter margins (0.75")
 * - Reduced line spacing
 * - Smaller paragraph spacing
 */

import AdmZip from 'adm-zip'
import { dirname, resolve } from 'path'
import { nicelog } from './lib/nicelog'

const DOCS_DIR = resolve(dirname(dirname(dirname(__filename))), 'documentation')
const INPUT_FILE = resolve(DOCS_DIR, 'tldraw-documentation.docx')
const OUTPUT_FILE = resolve(DOCS_DIR, 'tldraw-documentation.docx') // Overwrites the pandoc output

// Font settings
const BODY_FONT = 'Times New Roman'
const CODE_FONT = 'Consolas'
const BODY_SIZE = '22' // 11pt in half-points
const CODE_SIZE = '18' // 9pt in half-points
const H1_SIZE = '32' // 16pt
const H2_SIZE = '26' // 13pt
const H3_SIZE = '22' // 11pt

// Spacing in twips (1/20 of a point, 1440 twips = 1 inch)
const MARGIN_TWIPS = '1080' // 0.75 inch
const LINE_SPACING = '240' // Single spacing
const PARA_AFTER = '80' // ~4pt after paragraphs

function modifyStyles(xml: string): string {
	// Update default font throughout the document
	// Replace common fonts with Times New Roman
	xml = xml.replace(/w:ascii="[^"]*Calibri[^"]*"/g, `w:ascii="${BODY_FONT}"`)
	xml = xml.replace(/w:hAnsi="[^"]*Calibri[^"]*"/g, `w:hAnsi="${BODY_FONT}"`)
	xml = xml.replace(/w:cs="[^"]*Calibri[^"]*"/g, `w:cs="${BODY_FONT}"`)
	xml = xml.replace(/w:eastAsia="[^"]*Calibri[^"]*"/g, `w:eastAsia="${BODY_FONT}"`)

	// Also handle Arial
	xml = xml.replace(/w:ascii="Arial"/g, `w:ascii="${BODY_FONT}"`)
	xml = xml.replace(/w:hAnsi="Arial"/g, `w:hAnsi="${BODY_FONT}"`)

	// Update code/verbatim styles to use Consolas
	// Look for Source Code and Verbatim style definitions
	xml = xml.replace(
		/(<w:style[^>]*w:styleId="SourceCode"[^>]*>[\s\S]*?<w:rFonts[^>]*)(w:ascii="[^"]*")/g,
		`$1w:ascii="${CODE_FONT}"`
	)
	xml = xml.replace(
		/(<w:style[^>]*w:styleId="VerbatimChar"[^>]*>[\s\S]*?<w:rFonts[^>]*)(w:ascii="[^"]*")/g,
		`$1w:ascii="${CODE_FONT}"`
	)

	// Set code font size
	xml = xml.replace(
		/(<w:style[^>]*w:styleId="SourceCode"[^>]*>[\s\S]*?)(<w:sz[^/]*\/>|<w:sz[^>]*>[^<]*<\/w:sz>)/g,
		`$1<w:sz w:val="${CODE_SIZE}"/>`
	)
	xml = xml.replace(
		/(<w:style[^>]*w:styleId="VerbatimChar"[^>]*>[\s\S]*?)(<w:sz[^/]*\/>|<w:sz[^>]*>[^<]*<\/w:sz>)/g,
		`$1<w:sz w:val="${CODE_SIZE}"/>`
	)

	// Update Normal style
	xml = xml.replace(
		/(<w:style[^>]*w:styleId="Normal"[^>]*>[\s\S]*?<w:spacing[^>]*)(w:after="[^"]*")/g,
		`$1w:after="${PARA_AFTER}"`
	)
	xml = xml.replace(
		/(<w:style[^>]*w:styleId="Normal"[^>]*>[\s\S]*?<w:spacing[^>]*)(w:line="[^"]*")/g,
		`$1w:line="${LINE_SPACING}"`
	)

	return xml
}

function modifyDocumentSettings(xml: string): string {
	// Reduce paragraph spacing throughout the document
	// Match spacing elements and update them
	xml = xml.replace(/w:after="200"/g, `w:after="${PARA_AFTER}"`)
	xml = xml.replace(/w:after="160"/g, `w:after="${PARA_AFTER}"`)
	xml = xml.replace(/w:before="200"/g, `w:before="120"`)
	xml = xml.replace(/w:before="240"/g, `w:before="160"`)

	// Set line spacing to single (240 twips)
	xml = xml.replace(/w:line="276"/g, `w:line="${LINE_SPACING}"`)
	xml = xml.replace(/w:line="259"/g, `w:line="${LINE_SPACING}"`)

	// Replace Courier New (often used for code) with Consolas
	xml = xml.replace(/w:ascii="Courier New"/g, `w:ascii="${CODE_FONT}"`)
	xml = xml.replace(/w:hAnsi="Courier New"/g, `w:hAnsi="${CODE_FONT}"`)
	xml = xml.replace(/w:cs="Courier New"/g, `w:cs="${CODE_FONT}"`)

	// Replace monospace fonts with Consolas
	xml = xml.replace(/w:ascii="monospace"/g, `w:ascii="${CODE_FONT}"`)
	xml = xml.replace(/w:hAnsi="monospace"/g, `w:hAnsi="${CODE_FONT}"`)

	return xml
}

function modifySectionProperties(xml: string): string {
	// Update page margins
	// Default margins are usually 1440 (1 inch), we want 1080 (0.75 inch)
	xml = xml.replace(
		/<w:pgMar[^>]*\/>/g,
		`<w:pgMar w:top="${MARGIN_TWIPS}" w:right="${MARGIN_TWIPS}" w:bottom="${MARGIN_TWIPS}" w:left="${MARGIN_TWIPS}" w:header="720" w:footer="720" w:gutter="0"/>`
	)

	return xml
}

async function main() {
	nicelog('📝 Styling Word document...')
	nicelog(`   Input: ${INPUT_FILE}`)
	nicelog(`   Output: ${OUTPUT_FILE}`)

	// Read the docx file (it's a zip)
	const zip = new AdmZip(INPUT_FILE)

	// Process styles.xml
	const stylesEntry = zip.getEntry('word/styles.xml')
	if (stylesEntry) {
		let stylesXml = stylesEntry.getData().toString('utf8')
		stylesXml = modifyStyles(stylesXml)
		zip.updateFile('word/styles.xml', Buffer.from(stylesXml, 'utf8'))
		nicelog('   ✓ Updated styles.xml')
	}

	// Process document.xml
	const docEntry = zip.getEntry('word/document.xml')
	if (docEntry) {
		let docXml = docEntry.getData().toString('utf8')
		docXml = modifyDocumentSettings(docXml)
		docXml = modifySectionProperties(docXml)
		zip.updateFile('word/document.xml', Buffer.from(docXml, 'utf8'))
		nicelog('   ✓ Updated document.xml')
	}

	// Write the modified document
	zip.writeZip(OUTPUT_FILE)

	nicelog(`\n✅ Created: ${OUTPUT_FILE}`)
	nicelog('\nChanges applied:')
	nicelog(`   • Body font: ${BODY_FONT} (${parseInt(BODY_SIZE) / 2}pt)`)
	nicelog(`   • Code font: ${CODE_FONT} (${parseInt(CODE_SIZE) / 2}pt)`)
	nicelog(`   • Margins: 0.75"`)
	nicelog(`   • Line spacing: Single`)
	nicelog(`   • Reduced paragraph spacing`)
}

main().catch((error) => {
	nicelog(`❌ Failed: ${error}`)
	process.exit(1)
})
