import { describe, expect, it } from 'vitest'
import { operationFromPath } from './operation-map'

describe('operationFromPath', () => {
	it('maps resizing to resize', () => {
		expect(operationFromPath('select.resizing')).toBe('resize')
	})

	it('maps translating to translate', () => {
		expect(operationFromPath('select.translating')).toBe('translate')
	})

	it('maps rotating to rotate', () => {
		expect(operationFromPath('select.rotating')).toBe('rotate')
	})

	it('maps brushing to brush', () => {
		expect(operationFromPath('select.brushing')).toBe('brush')
	})

	it('maps drawing to draw', () => {
		expect(operationFromPath('draw.drawing')).toBe('draw')
	})

	it('maps erasing to erase', () => {
		expect(operationFromPath('eraser.erasing')).toBe('erase')
	})

	it('maps cropping to crop', () => {
		expect(operationFromPath('select.crop.cropping')).toBe('crop')
	})

	it('maps dragging_handle to drag_handle', () => {
		expect(operationFromPath('select.dragging_handle')).toBe('drag_handle')
	})

	it('maps scribble_brushing to scribble_brush', () => {
		expect(operationFromPath('select.scribble_brushing')).toBe('scribble_brush')
	})

	it('maps lasering to laser', () => {
		expect(operationFromPath('laser.lasering')).toBe('laser')
	})

	it('maps hand.dragging to pan', () => {
		expect(operationFromPath('hand.dragging')).toBe('pan')
	})

	it('maps select.dragging to translate (not pan)', () => {
		expect(operationFromPath('select.dragging')).toBe('translate')
	})

	it('returns null for idle states', () => {
		expect(operationFromPath('select.idle')).toBeNull()
	})

	it('returns null for unknown states', () => {
		expect(operationFromPath('select.pointing_shape')).toBeNull()
	})

	it('returns null for empty string', () => {
		expect(operationFromPath('')).toBeNull()
	})
})
