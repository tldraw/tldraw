import {
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiButton,
	useEditor,
	useTranslation,
	useValue,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-language-translations.css'

// There's a guide at the bottom of this file!

// [1]
function CustomToolbar() {
	const editor = useEditor()
	const msg = useTranslation()
	const selectedCount = useValue('selected count', () => editor.getSelectedShapeIds().length, [
		editor,
	])

	return (
		<div className="tlui-menu custom-language-toolbar">
			{/* [2] */}
			<span className="custom-language-count">
				{msg('example.selected', { count: selectedCount })}
			</span>
			<TldrawUiButton
				type="normal"
				onClick={() => editor.duplicateShapes(editor.getSelectedShapeIds())}
			>
				{/* [3] */}
				{msg('action.duplicate')}
			</TldrawUiButton>
			<TldrawUiButton
				type="normal"
				onClick={() => editor.deleteShapes(editor.getSelectedShapeIds())}
			>
				{msg('action.delete')}
			</TldrawUiButton>
		</div>
	)
}

// [4]
const overrides: TLUiOverrides = {
	translations: {
		en: {
			'action.duplicate': 'Make a copy',
			'action.delete': 'Remove',
			'example.selected':
				'{count, plural, =0 {Nothing selected} one {# shape selected} other {# shapes selected}}',
		},
		es: {
			'action.duplicate': 'Hacer una copia',
			'action.delete': 'Eliminar',
			'example.selected':
				'{count, plural, =0 {Nada seleccionado} one {# forma seleccionada} other {# formas seleccionadas}}',
		},
	},
}

// [5]
const components: TLComponents = {
	TopPanel: CustomToolbar,
}

export default function CustomLanguageTranslationExample() {
	return (
		<div className="tldraw__editor">
			{/* [6] */}
			<Tldraw overrides={overrides} components={components} />
		</div>
	)
}

/*
This example shows how to customize tldraw's translation strings and use them in your own
components. This is useful when you need to match your app's brand voice or terminology.

[1]
The `useTranslation` hook returns a function (conventionally named `msg`) that looks up a
translated string by key in the user's current language.

[2]
Messages are ICU MessageFormat, so one string covers every count. Pass the values it needs as a
second argument. The plural categories are the locale's own, which is why this can't be done by
picking between two strings in code: Arabic has six categories, Polish four, Russian three.

[3]
`action.duplicate` and `action.delete` are keys tldraw already uses in its own menus. Because we
override them below, both our toolbar and tldraw's built-in menus show the custom text.

[4]
The `translations` override maps a language code (like `en` or `es`) to an object of translation
keys and strings. You can override existing keys or add new ones for your own UI, like
`example.selected` here. Languages you don't override fall back to tldraw's defaults.

[5]
Define the components object outside the React component so it's a stable reference. The custom
toolbar is placed in the `TopPanel` slot.

[6]
Pass both the overrides and the components to the `Tldraw` component.

The custom translations also show up in tldraw's own menus. Try creating a shape and right
clicking it to see "Make a copy" and "Remove" in the context menu, or switch the language to
Spanish from the main menu's language submenu to see the `es` overrides — including the count,
which agrees with itself in both languages.
*/
