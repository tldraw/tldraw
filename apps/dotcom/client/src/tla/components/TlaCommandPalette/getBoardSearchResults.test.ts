import {
	Editor,
	TLShapeId,
	TLUiToolsContextType,
	createShapeId,
	createTLStore,
	defaultAddFontsFromNode,
	defaultBindingUtils,
	defaultShapeUtils,
	tipTapDefaultExtensions,
	toRichText,
} from 'tldraw'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { MAX_BOARD_RESULTS, getBoardSearchResults } from './getBoardSearchResults'

const tools = {
	text: { icon: 'tool-text' },
	note: { icon: 'tool-note' },
	rectangle: { icon: 'geo-rectangle' },
} as unknown as TLUiToolsContextType

let editor: Editor

beforeAll(() => {
	globalThis.ResizeObserver ??= class {
		observe() {}
		unobserve() {}
		disconnect() {}
	} as unknown as typeof ResizeObserver
})

beforeEach(() => {
	editor = new Editor({
		store: createTLStore({ shapeUtils: defaultShapeUtils, bindingUtils: defaultBindingUtils }),
		shapeUtils: defaultShapeUtils,
		bindingUtils: defaultBindingUtils,
		tools: [],
		getContainer: () => document.createElement('div'),
		options: {
			text: {
				addFontsFromNode: defaultAddFontsFromNode,
				tipTapConfig: { extensions: tipTapDefaultExtensions },
			},
		},
	})
})

afterEach(() => {
	editor.dispose()
})

function createText(id: TLShapeId, text: string, x = 0) {
	editor.createShape({ id, type: 'text', x, y: 0, props: { richText: toRichText(text) } })
}

function createOtherPage(name: string) {
	const firstPageId = editor.getCurrentPageId()
	editor.createPage({ name })
	const pageId = editor.getPages().find((page) => page.name === name)!.id
	editor.setCurrentPage(pageId)
	return { firstPageId, pageId }
}

function search(query: string) {
	return getBoardSearchResults(editor, query, tools).map(({ id, label, detail, icon }) => ({
		id,
		label,
		detail,
		icon,
	}))
}

describe('getBoardSearchResults', () => {
	it('lists current page hits first and names the page of the rest', () => {
		const otherId = createShapeId('other')
		const currentId = createShapeId('current')
		createText(createShapeId('miss'), 'nothing here')
		const { firstPageId } = createOtherPage('Other page')
		createText(otherId, 'Apple pie')
		editor.setCurrentPage(firstPageId)
		createText(currentId, 'apple tart')

		expect(search('apple')).toEqual([
			{ id: currentId, label: 'apple tart', detail: undefined, icon: 'tool-text' },
			{ id: otherId, label: 'Apple pie', detail: 'Other page', icon: 'tool-text' },
		])
	})

	it('uses the geo or shape type for the icon', () => {
		const geoId = createShapeId('geo')
		const noteId = createShapeId('note')
		editor.createShape({
			id: geoId,
			type: 'geo',
			props: { geo: 'rectangle', richText: toRichText('box label') },
		})
		editor.createShape({
			id: noteId,
			type: 'note',
			x: 300,
			props: { richText: toRichText('note label') },
		})

		expect(search('label').sort((a, b) => a.id.localeCompare(b.id))).toEqual([
			{ id: geoId, label: 'box label', detail: undefined, icon: 'geo-rectangle' },
			{ id: noteId, label: 'note label', detail: undefined, icon: 'tool-note' },
		])
	})

	it('collapses whitespace in both the text and the query', () => {
		const id = createShapeId('spaced')
		createText(id, 'hello \n\n  world  ')

		expect(search('Hello \t World')).toEqual([
			{ id, label: 'hello world', detail: undefined, icon: 'tool-text' },
		])
	})

	it('trims the start of labels whose match is far in', () => {
		const lateId = createShapeId('late')
		const edgeId = createShapeId('edge')
		createText(lateId, `${'a'.repeat(30)}needle`)
		createText(edgeId, `${'b'.repeat(16)}needle`, 300)

		expect(search('needle').sort((a, b) => a.id.localeCompare(b.id))).toEqual([
			{ id: edgeId, label: `${'b'.repeat(16)}needle`, detail: undefined, icon: 'tool-text' },
			{ id: lateId, label: `…${'a'.repeat(16)}needle`, detail: undefined, icon: 'tool-text' },
		])
	})

	it('caps results, keeping current page hits', () => {
		const currentId = createShapeId('current')
		const { firstPageId } = createOtherPage('Other page')
		for (let i = 0; i < MAX_BOARD_RESULTS + 10; i++) {
			createText(createShapeId(`other-${i}`), `match ${i}`, i * 200)
		}
		editor.setCurrentPage(firstPageId)
		createText(currentId, 'match current')

		const results = search('match')
		expect(results).toHaveLength(MAX_BOARD_RESULTS)
		expect(results[0]).toEqual({
			id: currentId,
			label: 'match current',
			detail: undefined,
			icon: 'tool-text',
		})
	})

	describe('onSelect', () => {
		it('switches to the page holding the shape', () => {
			const id = createShapeId('far')
			const { firstPageId, pageId } = createOtherPage('Other page')
			createText(id, 'far away')
			editor.setCurrentPage(firstPageId)

			getBoardSearchResults(editor, 'far', tools)[0].onSelect()
			expect(editor.getCurrentPageId()).toBe(pageId)
		})

		it('follows a shape moved to another page after the search', () => {
			const id = createShapeId('moved')
			createText(id, 'moving target')
			const [result] = getBoardSearchResults(editor, 'moving', tools)
			const { firstPageId, pageId } = createOtherPage('Other page')
			editor.setCurrentPage(firstPageId)
			editor.moveShapesToPage([id], pageId)
			editor.setCurrentPage(firstPageId)

			result.onSelect()
			expect(editor.getCurrentPageId()).toBe(pageId)
		})

		it('does nothing for a shape deleted after the search', () => {
			const id = createShapeId('gone')
			const { firstPageId } = createOtherPage('Other page')
			createText(id, 'soon gone')
			editor.setCurrentPage(firstPageId)
			const [result] = getBoardSearchResults(editor, 'gone', tools)
			editor.deleteShapes([id])
			const camera = editor.getCamera()

			result.onSelect()
			expect(editor.getCurrentPageId()).toBe(firstPageId)
			expect(editor.getCamera()).toEqual(camera)
		})
	})
})
