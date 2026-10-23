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
		//
		// A shape's name no longer comes through here: each util returns its own via `getShapeName`,
		// resolved against the editor's i18n. So "Rectangle" and "Image" below are the catalogue's
		// real text, where this stub would have produced the key's last segment.
		const intl = createIntl({ locale: 'en', defaultLocale: 'en', messages: {} })
		mockTranslate = vi.fn((key: string, values?: Record<string, unknown>) => {
			let defaultMessage = key
			if (key === 'a11y.multiple-shapes')
				defaultMessage = '{num, plural, one {# shape selected} other {# shapes selected}}'
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

		expect(message).toBe('Hello, Rectangle. 1 of 1')
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

		expect(message).toBe('A test image, Image. 1 of 1')
	})

	it('counts locked shapes in the shape count', () => {
		const box1 = createShapeId('box1')
		const locked = createShapeId('locked')
		const box2 = createShapeId('box2')

		editor.createShapes([
			{ id: box1, type: 'geo', x: 0, y: 0 },
			{ id: locked, type: 'geo', x: 100, y: 0, isLocked: true },
			{ id: box2, type: 'geo', x: 200, y: 0 },
		])

		const message = generateShapeAnnouncementMessage({
			editor,
			selectedShapeIds: [locked],
			msg: mockTranslate,
		})

		expect(message).toBe('Rectangle. 2 of 3')
	})

	it('announces a shape outside the reading order without a position', () => {
		const frame = createShapeId('frame')
		const child = createShapeId('child')

		editor.createShapes([
			{ id: frame, type: 'frame', x: 0, y: 0, props: { w: 400, h: 200 } },
			{ id: child, type: 'geo', x: 10, y: 10, parentId: frame },
		])

		const message = generateShapeAnnouncementMessage({
			editor,
			selectedShapeIds: [child],
			msg: mockTranslate,
		})

		expect(message).toBe('Rectangle.')
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

	// Each util names itself. Only the convention is left in A11y: a shape that doesn't override
	// `getShapeName` is announced by its tool's label.
	it('lets a shape name itself, and falls back to the tool label otherwise', () => {
		const geo = createShapeId('geo')
		const note = createShapeId('note')
		editor.createShapes([
			{ id: geo, type: 'geo', x: 0, y: 0, props: { geo: 'ellipse' } },
			{ id: note, type: 'note', x: 200, y: 0 },
		])

		// geo names itself by which geo it is, not by its shared type
		expect(editor.getShapeUtil('geo').getShapeName(editor.getShape(geo)!)).toBe('Ellipse')
		// a note doesn't override, so A11y's convention supplies the name
		expect(editor.getShapeUtil('note').getShapeName(editor.getShape(note)!)).toBeUndefined()
		expect(
			generateShapeAnnouncementMessage({
				editor,
				selectedShapeIds: [note],
				msg: mockTranslate,
			})
		).toContain('note')
	})
})
