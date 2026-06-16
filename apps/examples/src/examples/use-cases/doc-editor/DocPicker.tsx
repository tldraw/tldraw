import mammoth from 'mammoth/mammoth.browser'
import { useState } from 'react'
import proposalDocxUrl from './assets/proposal.docx?url'
import { MIN_PAGE_HEIGHT, PAGE_WIDTH } from './DocumentPageShapeUtil'

export interface Doc {
	name: string
	html: string
	width: number
	height: number
}

// [1]
function measurePageHeight(html: string): number {
	const el = window.document.createElement('div')
	el.className = 'DocEditor-page-content'
	el.style.position = 'absolute'
	el.style.left = '-9999px'
	el.style.top = '0'
	el.style.visibility = 'hidden'
	el.style.width = `${PAGE_WIDTH}px`
	el.style.height = 'auto'
	el.innerHTML = html
	window.document.body.appendChild(el)
	const height = el.scrollHeight
	window.document.body.removeChild(el)
	return Math.max(height, MIN_PAGE_HEIGHT)
}

// [2]
async function loadDoc(name: string, arrayBuffer: ArrayBuffer): Promise<Doc> {
	const { value: html } = await mammoth.convertToHtml({ arrayBuffer })
	return { name, html, width: PAGE_WIDTH, height: measurePageHeight(html) }
}

export function DocPicker({ onOpenDoc }: { onOpenDoc(doc: Doc): void }) {
	const [isLoading, setIsLoading] = useState(false)

	function onClickOpenDoc() {
		const input = window.document.createElement('input')
		input.type = 'file'
		input.accept = '.docx'
		input.addEventListener('change', async (e) => {
			const fileList = (e.target as HTMLInputElement).files
			if (!fileList || fileList.length === 0) return
			const file = fileList[0]

			setIsLoading(true)
			try {
				onOpenDoc(await loadDoc(file.name, await file.arrayBuffer()))
			} finally {
				setIsLoading(false)
			}
		})
		input.click()
	}

	async function onClickUseExample() {
		setIsLoading(true)
		try {
			const result = await fetch(proposalDocxUrl)
			onOpenDoc(await loadDoc('proposal.docx', await result.arrayBuffer()))
		} finally {
			setIsLoading(false)
		}
	}

	if (isLoading) {
		return <div className="DocPicker">Loading...</div>
	}

	return (
		<div className="DocPicker">
			<button onClick={onClickOpenDoc}>Open .docx</button>
			<div>or</div>
			<button onClick={onClickUseExample}>Use an example</button>
		</div>
	)
}

/*
The picker turns an uploaded .docx file into something we can render and annotate.

[1]
We render the converted HTML into a hidden, page-width element to measure how tall the
document is, then use that as the page height (clamped to at least one full page).

[2]
We use mammoth to convert the .docx into semantic HTML. mammoth handles .docx only; the
older binary .doc format isn't supported in the browser, so the file input accepts .docx.
*/
