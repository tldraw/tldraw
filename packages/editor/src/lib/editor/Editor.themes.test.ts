import { vi } from 'vitest'
import {
	DEFAULT_THEME,
	Geometry2d,
	RecordProps,
	Rectangle2d,
	ShapeUtil,
	T,
	TLShape,
	TLTheme,
	TLThemeId,
	TLThemes,
	TLUserPreferences,
	atom,
	createTLCurrentUser,
	createTLStore,
	react,
} from '../..'
import { Editor, TLEditorOptions } from './Editor'

const MY_CUSTOM_SHAPE_TYPE = 'my-custom-shape'

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[MY_CUSTOM_SHAPE_TYPE]: { w: number; h: number; text: string | undefined; isFilled: boolean }
	}
}

type TestBox = TLShape<typeof MY_CUSTOM_SHAPE_TYPE>

class TestBoxUtil extends ShapeUtil<TestBox> {
	static override type = MY_CUSTOM_SHAPE_TYPE
	static override props: RecordProps<TestBox> = {
		w: T.number,
		h: T.number,
		text: T.string.optional(),
		isFilled: T.boolean,
	}
	getDefaultProps(): TestBox['props'] {
		return { w: 100, h: 100, text: '', isFilled: false }
	}
	getGeometry(shape: TestBox): Geometry2d {
		return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true })
	}
	getIndicatorPath() {
		return undefined
	}
	component() {}
}

const OCEAN_ID = 'ocean' as TLThemeId
const oceanTheme: TLTheme = { ...DEFAULT_THEME, id: OCEAN_ID, fontSize: 20 }

// An isolated user keeps preference writes out of the shared localStorage-backed user.
function createIsolatedUser() {
	const userPreferences = atom<TLUserPreferences>('prefs', { id: 'me' })
	return createTLCurrentUser({
		userPreferences,
		setUserPreferences: (prefs) => userPreferences.set(prefs),
	})
}

function createEditor(opts: Partial<TLEditorOptions> = {}) {
	return new Editor({
		shapeUtils: [TestBoxUtil],
		bindingUtils: [],
		tools: [],
		store: createTLStore({ shapeUtils: [TestBoxUtil], bindingUtils: [] }),
		getContainer: () => document.body,
		user: createIsolatedUser(),
		...opts,
	})
}

let editor: Editor

beforeEach(() => {
	editor = createEditor()
})

afterEach(() => {
	editor.dispose()
})

describe('color mode', () => {
	it('defaults to light', () => {
		expect(editor.getColorMode()).toBe('light')
	})

	it('setColorMode writes the user color scheme preference', () => {
		expect(editor.setColorMode('dark')).toBe(editor)
		expect(editor.getColorMode()).toBe('dark')
		expect(editor.user.getUserPreferences().colorScheme).toBe('dark')

		editor.setColorMode('light')
		expect(editor.getColorMode()).toBe('light')
	})

	it('can start in dark mode via the colorScheme option', () => {
		editor.dispose()
		editor = createEditor({ colorScheme: 'dark' })
		expect(editor.getColorMode()).toBe('dark')
	})
})

describe('current theme', () => {
	it('defaults to the default theme', () => {
		expect(editor.getCurrentThemeId()).toBe('default')
		expect(editor.getCurrentTheme()).toEqual(DEFAULT_THEME)
		expect(editor.getThemes()).toEqual({ default: DEFAULT_THEME })
	})

	it('uses the themes and initialTheme options', () => {
		editor.dispose()
		editor = createEditor({ themes: { [OCEAN_ID]: oceanTheme }, initialTheme: OCEAN_ID })
		expect(editor.getCurrentThemeId()).toBe(OCEAN_ID)
		expect(editor.getCurrentTheme()).toEqual(oceanTheme)
		expect(editor.getThemes()).toEqual({ default: DEFAULT_THEME, [OCEAN_ID]: oceanTheme })
	})

	it('getTheme returns undefined for an unregistered id', () => {
		expect(editor.getTheme('default')).toEqual(DEFAULT_THEME)
		expect(editor.getTheme(OCEAN_ID)).toBeUndefined()
	})

	it('setCurrentTheme switches to a registered theme', () => {
		editor.updateTheme(oceanTheme)
		expect(editor.setCurrentTheme(OCEAN_ID)).toBe(editor)
		expect(editor.getCurrentThemeId()).toBe(OCEAN_ID)
		expect(editor.getCurrentTheme()).toEqual(oceanTheme)
	})

	// Locks in current behaviour, see #10558.
	it('setCurrentTheme warns about an unknown id but still sets it', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			editor.setCurrentTheme('nope' as TLThemeId)
			expect(warn).toHaveBeenCalledTimes(1)
			expect(warn.mock.calls[0][0]).toContain("Theme 'nope' not found")
			expect(editor.getCurrentThemeId()).toBe('nope')
		} finally {
			warn.mockRestore()
		}
	})

	it('getCurrentTheme is reactive to theme changes', () => {
		let fontSize = 0
		const stop = react('track font size', () => {
			fontSize = editor.getCurrentTheme().fontSize
		})
		try {
			expect(fontSize).toBe(DEFAULT_THEME.fontSize)
			editor.updateTheme(oceanTheme)
			editor.setCurrentTheme(OCEAN_ID)
			expect(fontSize).toBe(20)
			editor.updateTheme({ ...oceanTheme, fontSize: 32 })
			expect(fontSize).toBe(32)
			editor.setCurrentTheme('default')
			expect(fontSize).toBe(DEFAULT_THEME.fontSize)
		} finally {
			stop()
		}
	})
})

describe('updateTheme', () => {
	it('registers a new theme keyed by its id', () => {
		expect(editor.updateTheme(oceanTheme)).toBe(editor)
		expect(editor.getTheme(OCEAN_ID)).toEqual(oceanTheme)
		expect(Object.keys(editor.getThemes()).sort()).toEqual(['default', OCEAN_ID])
	})

	it('overrides an existing theme in place', () => {
		editor.updateTheme({ ...DEFAULT_THEME, fontSize: 24 })
		expect(editor.getTheme('default')).toEqual({ ...DEFAULT_THEME, fontSize: 24 })
		expect(editor.getCurrentTheme().fontSize).toBe(24)
	})
})

describe('updateThemes', () => {
	it('replaces all themes when given an object', () => {
		const next = {
			default: { ...DEFAULT_THEME, strokeWidth: 5 },
			[OCEAN_ID]: oceanTheme,
		} as unknown as TLThemes
		expect(editor.updateThemes(next)).toBe(editor)
		expect(editor.getThemes()).toEqual(next)
		expect(editor.getCurrentTheme().strokeWidth).toBe(5)
	})

	it('passes a deep copy to the callback so mutations do not leak into the previous value', () => {
		const before = editor.getThemes()
		editor.updateThemes((themes) => {
			themes.default.fontSize = 99
			return themes
		})
		expect(before.default.fontSize).toBe(DEFAULT_THEME.fontSize)
		expect(editor.getTheme('default')!.fontSize).toBe(99)
	})

	it('refuses to remove the default theme', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		try {
			editor.updateTheme(oceanTheme)
			editor.updateThemes({ [OCEAN_ID]: oceanTheme } as unknown as TLThemes)
			expect(warn).toHaveBeenCalledWith("The 'default' theme cannot be removed.")
			expect(editor.getThemes()).toEqual({ default: DEFAULT_THEME, [OCEAN_ID]: oceanTheme })
		} finally {
			warn.mockRestore()
		}
	})

	it('falls back to the default theme when the current theme is removed', () => {
		editor.updateTheme(oceanTheme)
		editor.setCurrentTheme(OCEAN_ID)
		editor.updateThemes((themes) => {
			delete (themes as unknown as Record<string, TLTheme>)[OCEAN_ID]
			return themes
		})
		expect(editor.getCurrentThemeId()).toBe('default')
		expect(editor.getCurrentTheme()).toEqual(DEFAULT_THEME)
	})

	it('keeps the current theme when it survives the update', () => {
		editor.updateTheme(oceanTheme)
		editor.setCurrentTheme(OCEAN_ID)
		editor.updateThemes((themes) => ({ ...themes, [OCEAN_ID]: { ...oceanTheme, fontSize: 30 } }))
		expect(editor.getCurrentThemeId()).toBe(OCEAN_ID)
		expect(editor.getCurrentTheme().fontSize).toBe(30)
	})
})
