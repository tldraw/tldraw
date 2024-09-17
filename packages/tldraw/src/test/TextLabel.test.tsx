import { act } from '@testing-library/react'
import { createShapeId, Editor, TldrawEditor, TLGeoShape, TLTextShape } from '@tldraw/editor'
import { defaultTools } from '../lib/defaultTools'
import { GeoShapeUtil } from '../lib/shapes/geo/GeoShapeUtil'
import { TextShapeUtil } from '../lib/shapes/text/TextShapeUtil'
import { renderTldrawComponent } from './testutils/renderTldrawComponent'

let editor: Editor

// querySelector doesn't support colons in ids unless escaped
const escapeId = (id: string) => id.replace(/([:])/g, '\\$1')

beforeEach(async () => {
	await renderTldrawComponent(
		<TldrawEditor
			shapeUtils={[GeoShapeUtil, TextShapeUtil]}
			initialState="select"
			tools={defaultTools}
			onMount={(editorApp) => {
				editor = editorApp
			}}
		/>,
		{ waitForPatterns: false }
	)
})

afterEach(() => {
	editor?.dispose()
})

describe('TextLabel', () => {
	it('sets id to shapeId for TextLabel in TextShapeUtil', async () => {
		const id = createShapeId()

		await act(async () => {
			editor.createShape<TLTextShape>({
				id,
				type: 'text',
				props: {
					text: 'Hello!',
				},
			})
		})

		const escapedId = escapeId(id)

		const elements = document.querySelectorAll(`#${escapedId}`)
		expect(elements.length).toBe(1)
	})

	it('sets id to {shapeId}-label for TextLabel in GeoShapeUtil', async () => {
		const id = createShapeId()

		await act(async () => {
			editor.createShape<TLGeoShape>({
				id,
				type: 'geo',
				props: {
					text: 'Hello!',
				},
			})
		})

		const escapedId = escapeId(id)

		const shapeIdElements = document.querySelectorAll(`#${escapedId}`)
		expect(shapeIdElements.length).toBe(1)

		const shapeIdLabelElements = document.querySelectorAll(`#${escapedId}-label`)
		expect(shapeIdLabelElements.length).toBe(1)
	})
})
