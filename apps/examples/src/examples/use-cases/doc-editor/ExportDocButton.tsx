import { PDFDocument } from 'pdf-lib'
import { useState } from 'react'
import { Box, Editor, useEditor } from 'tldraw'
import { Doc } from './DocPicker'

// px (96dpi) -> PDF points (72dpi)
const PX_TO_PT = 72 / 96

export function ExportDocButton({ doc }: { doc: Doc }) {
	const editor = useEditor()
	const [isExporting, setIsExporting] = useState(false)

	return (
		<button
			className="ExportDocButton"
			disabled={isExporting}
			onClick={async () => {
				setIsExporting(true)
				try {
					await exportDoc(editor, doc)
				} finally {
					setIsExporting(false)
				}
			}}
		>
			{isExporting ? 'Exporting...' : 'Export PDF'}
		</button>
	)
}

async function exportDoc(editor: Editor, doc: Doc) {
	const bounds = new Box(0, 0, doc.width, doc.height)
	const shapeIds = Array.from(editor.getCurrentPageShapeIds())

	// Flatten the document and its annotations into a single image.
	const { blob } = await editor.toImage(shapeIds, {
		format: 'png',
		background: false,
		bounds,
		padding: 0,
		scale: 2,
	})

	// Place the image onto a new PDF page sized to the document.
	const pdf = await PDFDocument.create()
	const pageWidth = doc.width * PX_TO_PT
	const pageHeight = doc.height * PX_TO_PT
	const page = pdf.addPage([pageWidth, pageHeight])
	const image = await pdf.embedPng(await blob.arrayBuffer())
	page.drawImage(image, { x: 0, y: 0, width: pageWidth, height: pageHeight })

	const url = URL.createObjectURL(
		new Blob([(await pdf.save()) as BlobPart], { type: 'application/pdf' })
	)
	const a = document.createElement('a')
	a.href = url
	a.download = doc.name.replace(/\.docx?$/i, '') + '.pdf'
	a.click()
	URL.revokeObjectURL(url)
}
