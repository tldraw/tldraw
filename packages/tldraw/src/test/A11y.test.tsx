import { createShapeId, toRichText } from '@tldraw/editor'
import { Mock, vi } from 'vitest'
import { generateShapeAnnouncementMessage } from '../lib/ui/components/A11y'
import { TestEditor } from './TestEditor'

describe('A11y Shape Announcements', () => {
	let editor: TestEditor
	let mockTranslate: Mock

	beforeEach(() => {
		editor = new TestEditor()

		// Create a simple translation mock
		mockTranslate = vi.fn((key) => {
			if (key === 'a11y.multiple-shapes') return '{num} shapes selected'
			if (key === 'a11y.shape') return 'Shape'
			if (key === 'a11y.text') return 'Text'
			if (key === 'a11y.shape-index') return '{num} of {total}'
			if (key === 'a11y.shape-image') return 'image'
			if (key === 'a11y.shape-video') return 'video'
			if (key.startsWith('geo-style.')) return key.split('.')[1]
			if (key.startsWith('tool.')) return key.split('.')[1]
			return key
		})
	})

	afterEach(() => {
		editor.dispose()
	})

	it('announces when multiple shapes are selected', () => {
		const box1 = createShapeId('box1')
		const box2 = createShapeId('box2')

		// Create shapes
		editor.createShapes([
			{ id: box1, type: 'geo', x: 0, y: 0 },
			{ id: box2, type: 'geo', x: 100, y: 0 },
		])

		// Get announcement for multiple shapes
		const message = generateShapeAnnouncementMessage({
			editor,
			selectedShapeIds: [box1, box2],
			msg: mockTranslate,
		})

		expect(message).toBe('2 shapes selected')
	})

	it('announces single shape selection with type and index', () => {
		const shapeId = createShapeId('rectangle')

		// Create a shape
		editor.createShapes([
			{
				id: shapeId,
				type: 'geo',
				props: { geo: 'rectangle', richText: toRichText('Hello') },
				x: 0,
				y: 0,
			},
		])

		// Get announcement for single shape
		const message = generateShapeAnnouncementMessage({
			editor,
			selectedShapeIds: [shapeId],
			msg: mockTranslate,
		})

		expect(message).toBe('Hello, rectangle. 1 of 1')
	})

	it('announces image shape with alt text', () => {
		const imageId = createShapeId('image')

		// Create an image shape with alt text
		editor.createShapes([
			{ id: imageId, type: 'image', props: { altText: 'A test image' }, x: 0, y: 0 },
		])

		// Get announcement for image
		const message = generateShapeAnnouncementMessage({
			editor,
			selectedShapeIds: [imageId],
			msg: mockTranslate,
		})

		expect(message).toBe('A test image, image. 1 of 1')
	})

	it('returns empty string when no shapes are selected', () => {
		// Get announcement for empty selection
		const message = generateShapeAnnouncementMessage({
			editor,
			selectedShapeIds: [],
			msg: mockTranslate,
		})

		expect(message).toBe('')
	})
})
