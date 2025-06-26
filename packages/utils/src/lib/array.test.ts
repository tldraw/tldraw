import { mergeArraysAndReplaceDefaults } from './array'

describe('mergeArraysAndReplaceDefaults', () => {
	it('should merge custom entries with defaults, allowing custom entries to override defaults', () => {
		const defaults = [
			{ id: 'select', name: 'Default Select' },
			{ id: 'draw', name: 'Default Draw' },
			{ id: 'eraser', name: 'Default Eraser' },
		]

		const customEntries = [
			{ id: 'select', name: 'Custom Select' },
			{ id: 'custom-tool', name: 'Custom Tool' },
		]

		const result = mergeArraysAndReplaceDefaults('id', customEntries, defaults)

		expect(result).toEqual([
			{ id: 'draw', name: 'Default Draw' },
			{ id: 'eraser', name: 'Default Eraser' },
			{ id: 'select', name: 'Custom Select' },
			{ id: 'custom-tool', name: 'Custom Tool' },
		])
	})

	it('should handle empty custom entries', () => {
		const defaults = [
			{ id: 'select', name: 'Default Select' },
			{ id: 'draw', name: 'Default Draw' },
		]

		const customEntries: typeof defaults = []

		const result = mergeArraysAndReplaceDefaults('id', customEntries, defaults)

		expect(result).toEqual(defaults)
	})

	it('should handle empty defaults', () => {
		const defaults: Array<{ id: string; name: string }> = []

		const customEntries = [{ id: 'custom-tool', name: 'Custom Tool' }]

		const result = mergeArraysAndReplaceDefaults('id', customEntries, defaults)

		expect(result).toEqual(customEntries)
	})

	it('should handle both empty arrays', () => {
		const defaults: Array<{ id: string; name: string }> = []
		const customEntries: Array<{ id: string; name: string }> = []

		const result = mergeArraysAndReplaceDefaults('id', customEntries, defaults)

		expect(result).toEqual([])
	})

	it('should work with different key names', () => {
		const defaults = [
			{ type: 'text', name: 'Default Text' },
			{ type: 'geo', name: 'Default Geo' },
		]

		const customEntries = [
			{ type: 'text', name: 'Custom Text' },
			{ type: 'custom', name: 'Custom Shape' },
		]

		const result = mergeArraysAndReplaceDefaults('type', customEntries, defaults)

		expect(result).toEqual([
			{ type: 'geo', name: 'Default Geo' },
			{ type: 'text', name: 'Custom Text' },
			{ type: 'custom', name: 'Custom Shape' },
		])
	})
})
