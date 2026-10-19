import { DEFAULT_THEME, TLTheme } from '@tldraw/editor'
import { getFontCheckboxStyle } from './default-shape-constants'

function themeWithSansCheckbox(checkbox: TLTheme['fonts']['sans']['checkbox']): TLTheme {
	return {
		...DEFAULT_THEME,
		fonts: { ...DEFAULT_THEME.fonts, sans: { ...DEFAULT_THEME.fonts.sans, checkbox } },
	}
}

describe('getFontCheckboxStyle', () => {
	it('returns nothing for a font without its own checkboxes', () => {
		expect(getFontCheckboxStyle(DEFAULT_THEME, 'sans')).toBeUndefined()
		expect(getFontCheckboxStyle(DEFAULT_THEME, 'not-a-font')).toBeUndefined()
	})

	it('fills every box slot by cycling through the font boxes', () => {
		const theme = themeWithSansCheckbox({ boxes: ['a', 'b', 'c'], tick: 't' })
		expect(getFontCheckboxStyle(theme, 'sans')).toEqual({
			'--tl-checkbox-box-1': 'url("a")',
			'--tl-checkbox-box-2': 'url("b")',
			'--tl-checkbox-box-3': 'url("c")',
			'--tl-checkbox-box-4': 'url("a")',
			'--tl-checkbox-box-5': 'url("b")',
			'--tl-checkbox-box-6': 'url("c")',
			'--tl-checkbox-tick': 'url("t")',
		})
	})

	it('leaves out what the font does not supply', () => {
		const theme = themeWithSansCheckbox({ tick: 't' })
		expect(getFontCheckboxStyle(theme, 'sans')).toEqual({ '--tl-checkbox-tick': 'url("t")' })
	})

	it('returns the same object for the same theme entry, so labels stay memoized', () => {
		expect(getFontCheckboxStyle(DEFAULT_THEME, 'draw')).toBe(
			getFontCheckboxStyle(DEFAULT_THEME, 'draw')
		)
	})

	it('escapes quotes, backslashes and newlines as CSS escapes', () => {
		const theme = themeWithSansCheckbox({ tick: 'a"b\\c\nd' })
		expect(getFontCheckboxStyle(theme, 'sans')).toEqual({
			'--tl-checkbox-tick': 'url("a\\22 b\\5c c\\a d")',
		})
	})
})
