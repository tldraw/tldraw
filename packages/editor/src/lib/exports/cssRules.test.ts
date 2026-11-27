import { isDefaultStyle } from './cssRules'

const defaultStyles = { 'text-shadow': 'none', 'background-color': 'rgba(0, 0, 0, 0)' }

describe('isDefaultStyle', () => {
	it('leaves out a default value', () => {
		expect(isDefaultStyle('text-shadow', 'none', { defaultStyles, parentStyles: {} })).toBe(true)
	})

	it('keeps a value that differs from the default', () => {
		const shadow = 'rgb(255, 255, 255) 0px 1px 0px'
		expect(isDefaultStyle('text-shadow', shadow, { defaultStyles, parentStyles: {} })).toBe(false)
	})

	it('keeps an inherited property reset to its default under an ancestor that sets it', () => {
		// A highlight (`mark { text-shadow: none }`) inside text with an outline: without its
		// `none`, the export draws the mark with the outline.
		const parentStyles = { 'text-shadow': 'rgb(255, 255, 255) 0px 1px 0px' }
		expect(isDefaultStyle('text-shadow', 'none', { defaultStyles, parentStyles })).toBe(false)
	})

	it('leaves out an inherited default its ancestors share', () => {
		const parentStyles = { 'text-shadow': 'none' }
		expect(isDefaultStyle('text-shadow', 'none', { defaultStyles, parentStyles })).toBe(true)
	})

	it('leaves out a property that isn’t inherited, whatever its ancestors set', () => {
		const parentStyles = { 'background-color': 'rgb(253, 221, 0)' }
		expect(
			isDefaultStyle('background-color', 'rgba(0, 0, 0, 0)', { defaultStyles, parentStyles })
		).toBe(true)
	})
})
