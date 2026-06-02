import { createShapeId, toRichText } from '@tldraw/editor'
import { vi } from 'vitest'
import { TestEditor } from './TestEditor'

vi.useRealTimers()

let editor: TestEditor

const ids = {
	text: createShapeId('text'),
	geo: createShapeId('geo'),
}

beforeEach(() => {
	editor = new TestEditor()
	editor.createShapes([
		{ id: ids.text, type: 'text', x: 0, y: 0, props: { richText: toRichText('Hello') } },
		{
			id: ids.geo,
			type: 'geo',
			x: 200,
			y: 0,
			props: { w: 100, h: 100, richText: toRichText('Hello') },
		},
	])
	editor.selectAll()
})

describe('text outline preference', () => {
	it('is enabled by default', () => {
		expect(editor.user.getIsTextOutlineEnabled()).toBe(true)
	})

	it('drives the outline in SVG export for text and geo labels', async () => {
		const withOutline = await editor.getSvgString([ids.text, ids.geo])
		expect(withOutline?.svg).toContain('text-shadow: var(--tl-text-outline)')
		expect(withOutline?.svg).toContain('tl-text__outline')
		expect(withOutline?.svg).not.toContain('tl-text__no-outline')

		editor.user.updateUserPreferences({ isTextOutlineEnabled: false })

		const withoutOutline = await editor.getSvgString([ids.text, ids.geo])
		expect(withoutOutline?.svg).not.toContain('text-shadow: var(--tl-text-outline)')
		expect(withoutOutline?.svg).toContain('tl-text__no-outline')
		expect(withoutOutline?.svg).not.toContain('tl-text__outline ')
	})
})
