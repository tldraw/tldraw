import { createShapeId, toRichText } from '@tldraw/editor'
import { createIntl } from 'react-intl'
import { Mock, vi } from 'vitest'
import { generateShapeAnnouncementMessage } from '../lib/ui/components/A11y'
import { TestEditor } from './TestEditor'

describe('A11y Shape Announcements', () => {
	let editor: TestEditor
	let mockTranslate: Mock

	beforeEach(() => {
		editor = new TestEditor()

		// Formats through real ICU like `useTranslation` does, so a malformed message here fails the
		// test rather than announcing its own placeholders.
		const intl = createIntl({ locale: 'en', defaultLocale: 'en', messages: {} })
		mockTranslate = vi.fn((key: string, values?: Record<string, unknown>) => {
			let defaultMessage = key
			if (key === 'a11y.multiple-shapes') defaultMessage = '{num} shapes selected'
			else if (key === 'a11y.shape') defaultMessage = 'Shape'
			else if (key === 'a11y.text') defaultMessage = 'Text'
			else if (key === 'a11y.shape-index') defaultMessage = '{num} of {total}'
			else if (key === 'a11y.shape-image') defaultMessage = 'image'
			else if (key === 'a11y.shape-video') defaultMessage = 'video'
			else if (key.startsWith('geo-style.')) defaultMessage = key.split('.')[1]
			else if (key.startsWith('tool.')) defaultMessage = key.split('.')[1]
			// The message is chosen above, so it can't be the literal the rule wants here.
			// eslint-disable-next-line tldraw/enforce-default-message
			return intl.formatMessage({ id: key, defaultMessage }, values as any)
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
