import { createShapeId } from '@tldraw/editor'
import { computePageMask, legacySegmentShIntersect, toClipPathCss } from './helpers/nestedClipMask'
import { TestEditor } from './TestEditor'

/** Same layout as nested-clip-bug-repro / frames.test.ts "masks its nested children". */
function setupNestedFrames(editor: TestEditor) {
	const outer = createShapeId('outer')
	const inner = createShapeId('inner')
	const geo = createShapeId('geo')

	editor.createShape({
		id: outer,
		type: 'frame',
		x: 100,
		y: 100,
		props: { w: 100, h: 100, name: 'outer' },
	})
	editor.createShape({
		id: inner,
		type: 'frame',
		x: 50,
		y: 50,
		parentId: outer,
		props: { w: 100, h: 100, name: 'inner' },
	})
	editor.createShape({
		id: geo,
		type: 'geo',
		x: -50,
		y: -50,
		parentId: inner,
		props: { w: 150, h: 150, geo: 'rectangle' },
	})

	return geo
}

describe('nested frames legacy clip', () => {
	it('legacy segment-SH clip-path differs from the SDK on the nested frame layout', () => {
		const editor = new TestEditor()
		const geoId = setupNestedFrames(editor)

		const sdk = editor.getShapeClipPath(geoId)
		const pageMask = computePageMask(editor, geoId, legacySegmentShIntersect)
		const legacy = pageMask ? toClipPathCss(editor, geoId, pageMask) : undefined

		expect(sdk).toBeDefined()
		expect(legacy).toBeDefined()
		expect(legacy).not.toBe(sdk)
		expect(legacy).toContain('75px')
		expect(sdk).toContain('50px 50px')
	})
})
