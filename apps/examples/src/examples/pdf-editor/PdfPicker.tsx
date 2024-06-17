import { useState } from 'react'
import { AssetRecordType, Box, TLAssetId, TLShapeId, createShapeId } from 'tldraw'
import tldrawPdf from './assets/tldraw.pdf'

export interface PdfPage {
	src: string
	bounds: Box
	assetId: TLAssetId
	shapeId: TLShapeId
}

export interface Pdf {
	name: string
	pages: PdfPage[]
	source: string | ArrayBuffer
}

const pageSpacing = 32

export function PdfPicker({ onOpenPdf }: { onOpenPdf: (pdf: Pdf) => void }) {
	const [isLoading, setIsLoading] = useState(false)

	async function loadPdf(name: string, source: ArrayBuffer): Promise<Pdf> {
		const PdfJS = await import('pdfjs-dist')
		PdfJS.GlobalWorkerOptions.workerSrc = new URL(
			'pdfjs-dist/build/pdf.worker.min.mjs',
			import.meta.url
		).toString()
		const pdf = await PdfJS.getDocument(source.slice(0)).promise
		const pages: PdfPage[] = []

		const canvas = window.document.createElement('canvas')
		const context = canvas.getContext('2d')
		if (!context) throw new Error('Failed to create canvas context')

		const visualScale = 1.5
		const scale = window.devicePixelRatio

		let top = 0
		let widest = 0
		for (let i = 1; i <= pdf.numPages; i++) {
			const page = await pdf.getPage(i)
			const viewport = page.getViewport({ scale: scale * visualScale })
			canvas.width = viewport.width
			canvas.height = viewport.height
			const renderContext = {
				canvasContext: context,
				viewport,
			}
			await page.render(renderContext).promise

			const width = viewport.width / scale
			const height = viewport.height / scale
			pages.push({
				src: canvas.toDataURL(),
				bounds: new Box(0, top, width, height),
				assetId: AssetRecordType.createId(),
				shapeId: createShapeId(),
			})
			top += height + pageSpacing
			widest = Math.max(widest, width)
		}
		canvas.width = 0
		canvas.height = 0

		for (const page of pages) {
			page.bounds.x = (widest - page.bounds.width) / 2
		}

		return {
			name,
			pages,
			source,
		}
	}

	function onClickOpenPdf() {
		const input = window.document.createElement('input')
		input.type = 'file'
		input.accept = 'application/pdf'
		input.addEventListener('change', async (e) => {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) return
			const file = fileList[0]

			setIsLoading(true)
			try {
				const pdf = await loadPdf(file.name, await file.arrayBuffer())
				onOpenPdf(pdf)
			} finally {
				setIsLoading(false)
			}
		})
		input.click()
	}

	async function onClickUseExample() {
		setIsLoading(true)
		try {
			const result = await fetch(tldrawPdf)
			const pdf = await loadPdf('tldraw.pdf', await result.arrayBuffer())
			onOpenPdf(pdf)
		} finally {
			setIsLoading(false)
		}
	}

	if (isLoading) {
		return <div className="PdfPicker">Loading...</div>
	}

	return (
		<div className="PdfPicker">
			<button onClick={onClickOpenPdf}>Open PDF</button>
			<div>or</div>
			<button onClick={onClickUseExample}>Use an example</button>
		</div>
	)
}
