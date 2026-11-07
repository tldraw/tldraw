import { TLTheme } from '@tldraw/tlschema'
import { MockInstance, vi } from 'vitest'
import { TestEditor } from '../../../test/TestEditor'
import { DEFAULT_THEME } from './defaultThemes'

// Optional so that other tests' theme objects still satisfy TLThemes.
declare module '@tldraw/tlschema' {
	interface TLThemes {
		ocean?: TLTheme
		sunset?: TLTheme
	}
}

const oceanTheme: TLTheme = { ...DEFAULT_THEME, id: 'ocean' }

let editor: TestEditor
let warn: MockInstance

beforeEach(() => {
	editor = new TestEditor({ themes: { ocean: oceanTheme } })
	warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
	warn.mockRestore()
	editor.dispose()
})

describe('setCurrentTheme', () => {
	it('switches to a registered theme', () => {
		editor.setCurrentTheme('ocean')

		expect(editor.getCurrentThemeId()).toBe('ocean')
		expect(editor.getCurrentTheme()).toBe(oceanTheme)
		expect(warn).not.toHaveBeenCalled()
	})

	it('warns and keeps the current theme when the id is not registered', () => {
		editor.setCurrentTheme('sunset')

		expect(warn).toHaveBeenCalledWith("Theme 'sunset' not found. Available themes: default, ocean")
		expect(editor.getCurrentThemeId()).toBe('default')
		expect(editor.getCurrentTheme()).toBe(DEFAULT_THEME)
	})

	it('keeps the previous theme rather than falling back to default', () => {
		editor.setCurrentTheme('ocean')
		editor.setCurrentTheme('sunset')

		expect(editor.getCurrentThemeId()).toBe('ocean')
		expect(editor.getCurrentTheme()).toBe(oceanTheme)
	})
})
