import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { mockUniqueId, setUserPreferences } from '@tldraw/editor'
import { TestEditor } from '../../../test/TestEditor'
import { putExcalidrawContent } from './putExcalidrawContent'

let nextNanoId = 0
mockUniqueId(() => `${++nextNanoId}`)

beforeEach(() => {
	nextNanoId = 0
	setUserPreferences({ id: '4', name: '', color: '#7B66DC' })
})

describe('putExcalidrawContent test fixtures', () => {
	const files = readdirSync(join(__dirname, 'excalidraw-test-fixtures')).filter((fileName) =>
		fileName.endsWith('.json')
	)

	test.each(files)('%s', async (fileName) => {
		const filePath = join(__dirname, 'excalidraw-test-fixtures', fileName)
		const fileContent = JSON.parse(await readFile(filePath, 'utf-8'))

		const editor = new TestEditor()

		putExcalidrawContent(editor, fileContent)

		expect(editor.store.serialize()).toMatchSnapshot()
	})
})

describe('putExcalidrawContent stroke widths', () => {
	function makeElement(overrides: Record<string, unknown>) {
		return {
			id: `elm-${overrides.type}`,
			isDeleted: false,
			fillStyle: 'solid',
			strokeWidth: 2,
			strokeStyle: 'solid',
			roughness: 1,
			opacity: 100,
			angle: 0,
			x: 0,
			y: 0,
			strokeColor: '#1e1e1e',
			backgroundColor: 'transparent',
			width: 100,
			height: 100,
			groupIds: [],
			frameId: null,
			roundness: null,
			boundElements: null,
			link: null,
			locked: false,
			...overrides,
		}
	}

	function pasteWithStrokeWidth(strokeWidth: number) {
		const editor = new TestEditor()
		putExcalidrawContent(editor, {
			type: 'excalidraw/clipboard',
			elements: [
				makeElement({ type: 'rectangle', strokeWidth }),
				makeElement({
					type: 'freedraw',
					strokeWidth,
					points: [
						[0, 0, 0.5],
						[10, 10, 0.5],
						[20, 0, 0.5],
					],
				}),
				makeElement({
					type: 'line',
					strokeWidth,
					points: [
						[0, 0],
						[50, 50],
					],
				}),
				makeElement({
					type: 'arrow',
					strokeWidth,
					points: [
						[0, 0],
						[50, 50],
					],
					startBinding: null,
					endBinding: null,
					startArrowhead: null,
					endArrowhead: 'arrow',
					elbowed: false,
				}),
			],
			files: {},
		})
		return Object.fromEntries(
			editor.getCurrentPageShapes().map((shape) => [shape.type, (shape.props as any).size])
		)
	}

	it.each([
		[1, 's'],
		[2, 'm'],
		[3, 'l'],
		[4, 'xl'],
	])('maps the preset stroke width %s to %s', (strokeWidth, size) => {
		expect(pasteWithStrokeWidth(strokeWidth)).toEqual({
			geo: size,
			draw: size,
			line: size,
			arrow: size,
		})
	})

	it.each([
		[0, 's'],
		[0.5, 's'],
		[1.4, 's'],
		[1.5, 'm'],
		[2.6, 'l'],
		[6, 'xl'],
		[100, 'xl'],
	])('snaps the custom stroke width %s to %s', (strokeWidth, size) => {
		expect(pasteWithStrokeWidth(strokeWidth)).toEqual({
			geo: size,
			draw: size,
			line: size,
			arrow: size,
		})
	})
})
