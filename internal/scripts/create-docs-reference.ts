#!/usr/bin/env tsx

/**
 * Creates a reference document for Pandoc with custom styling:
 * - Times New Roman for all prose
 * - Consolas for all code
 * - Tighter margins and spacing for density
 */

import {
	convertInchesToTwip,
	Document,
	HeadingLevel,
	Packer,
	PageOrientation,
	Paragraph,
	TextRun,
} from 'docx'
import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { nicelog } from './lib/nicelog'

const DOCS_DIR = resolve(dirname(dirname(dirname(__filename))), 'documentation')
const REFERENCE_FILE = resolve(DOCS_DIR, 'reference.docx')

// Font settings
const BODY_FONT = 'Times New Roman'
const CODE_FONT = 'Consolas'
const BODY_SIZE = 22 // 11pt in half-points
const CODE_SIZE = 20 // 10pt in half-points
const HEADING1_SIZE = 32 // 16pt
const HEADING2_SIZE = 28 // 14pt
const HEADING3_SIZE = 24 // 12pt

async function main() {
	nicelog('📄 Creating reference document for Pandoc...')

	const doc = new Document({
		styles: {
			default: {
				document: {
					run: {
						font: BODY_FONT,
						size: BODY_SIZE,
					},
					paragraph: {
						spacing: {
							after: 120, // 6pt after paragraphs
							line: 240, // Single line spacing (240 twips = 1 line)
						},
					},
				},
				heading1: {
					run: {
						font: BODY_FONT,
						size: HEADING1_SIZE,
						bold: true,
					},
					paragraph: {
						spacing: {
							before: 240,
							after: 120,
						},
					},
				},
				heading2: {
					run: {
						font: BODY_FONT,
						size: HEADING2_SIZE,
						bold: true,
					},
					paragraph: {
						spacing: {
							before: 200,
							after: 100,
						},
					},
				},
				heading3: {
					run: {
						font: BODY_FONT,
						size: HEADING3_SIZE,
						bold: true,
					},
					paragraph: {
						spacing: {
							before: 160,
							after: 80,
						},
					},
				},
				heading4: {
					run: {
						font: BODY_FONT,
						size: BODY_SIZE,
						bold: true,
					},
					paragraph: {
						spacing: {
							before: 120,
							after: 60,
						},
					},
				},
			},
			paragraphStyles: [
				{
					id: 'Normal',
					name: 'Normal',
					run: {
						font: BODY_FONT,
						size: BODY_SIZE,
					},
					paragraph: {
						spacing: {
							after: 120,
							line: 240,
						},
					},
				},
				{
					id: 'SourceCode',
					name: 'Source Code',
					basedOn: 'Normal',
					run: {
						font: CODE_FONT,
						size: CODE_SIZE,
					},
					paragraph: {
						spacing: {
							after: 0,
							line: 220,
						},
					},
				},
				{
					id: 'VerbatimChar',
					name: 'Verbatim Char',
					basedOn: 'Normal',
					run: {
						font: CODE_FONT,
						size: CODE_SIZE,
					},
				},
			],
			characterStyles: [
				{
					id: 'VerbatimChar',
					name: 'Verbatim Char',
					run: {
						font: CODE_FONT,
						size: CODE_SIZE,
					},
				},
			],
		},
		sections: [
			{
				properties: {
					page: {
						margin: {
							top: convertInchesToTwip(0.75),
							right: convertInchesToTwip(0.75),
							bottom: convertInchesToTwip(0.75),
							left: convertInchesToTwip(0.75),
						},
						size: {
							orientation: PageOrientation.PORTRAIT,
						},
					},
				},
				children: [
					// Sample content to establish styles
					new Paragraph({
						text: 'Heading 1',
						heading: HeadingLevel.HEADING_1,
					}),
					new Paragraph({
						text: 'Heading 2',
						heading: HeadingLevel.HEADING_2,
					}),
					new Paragraph({
						text: 'Heading 3',
						heading: HeadingLevel.HEADING_3,
					}),
					new Paragraph({
						children: [
							new TextRun({
								text: 'Normal body text in Times New Roman.',
								font: BODY_FONT,
								size: BODY_SIZE,
							}),
						],
					}),
					new Paragraph({
						children: [
							new TextRun({
								text: 'const code = "Consolas font";',
								font: CODE_FONT,
								size: CODE_SIZE,
							}),
						],
						style: 'SourceCode',
					}),
				],
			},
		],
	})

	const buffer = await Packer.toBuffer(doc)
	writeFileSync(REFERENCE_FILE, buffer)

	nicelog(`✅ Created: ${REFERENCE_FILE}`)
	nicelog('   Use with: pandoc --reference-doc=documentation/reference.docx')
}

main().catch((error) => {
	nicelog(`❌ Failed: ${error}`)
	process.exit(1)
})
