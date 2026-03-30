import { TLTextShape } from '@tldraw/editor'
import { defaultHandleExternalTextContent } from '../lib/defaultExternalContentHandlers'
import { TestEditor } from './TestEditor'

let editor: TestEditor

beforeEach(() => {
	editor = new TestEditor()
})
afterEach(() => {
	editor?.dispose()
})

async function pasteText(text: string, html?: string) {
	const point = editor.getViewportPageBounds().center
	await defaultHandleExternalTextContent(editor, { point, text, html })
}

describe('When pasting text', () => {
	it('pastes different types of the same text in the same place', async () => {
		const TEXT_TO_PASTE = [
			`<p class="p1" style="margin: 0px; font: 400 12px Helvetica; color: rgb(0, 0, 0); letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; white-space: normal; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial;">Hello world</p>`,
			'Hello world',
			`<meta charset="utf-8"><p dir="auto" data-pm-slice="0 0 []">Hello world</p>`,
		]

		for (const text of TEXT_TO_PASTE) {
			await pasteText('hello world', text)
		}

		const shapes = editor.getLastCreatedShapes(3) as TLTextShape[]

		const {
			x,
			y,
			props: { w },
		} = shapes[0]

		expect(shapes[1].x).toBe(x)
		expect(shapes[1].y).toBe(y)
		expect(shapes[1].props.w).toBe(w)

		expect(shapes[2].x).toBe(x)
		expect(shapes[2].y).toBe(y)
		expect(shapes[2].props.w).toBe(w)
	})
})
