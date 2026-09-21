import {
	TLComponents,
	TLUiOverrides,
	Tldraw,
	TldrawUiButton,
	useEditor,
	useTranslation,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './custom-language-translations.css'

// There's a guide at the bottom of this file!

// [1]
function CustomToolbar() {
	const editor = useEditor()
	const msg = useTranslation()

	return (
		<div className="tlui-menu custom-language-toolbar">
			<TldrawUiButton
				type="normal"
				onClick={() => editor.duplicateShapes(editor.getSelectedShapeIds())}
			>
				{/* [2] */}
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

// [3]
const overrides: TLUiOverrides = {
	translations: {
		en: {
			'action.duplicate': 'Make a copy',
			'action.delete': 'Remove',
		},
		es: {
			'action.duplicate': 'Hacer una copia',
			'action.delete': 'Eliminar',
		},
	},
}

// [4]
const components: TLComponents = {
	TopPanel: CustomToolbar,
}

export default function CustomLanguageTranslationExample() {
	return (
		<div className="tldraw__editor">
			{/* [5] */}
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
`action.duplicate` and `action.delete` are keys tldraw already uses in its own menus. Because we
override them below, both our toolbar and tldraw's built-in menus show the custom text.

[3]
The `translations` override maps a language code (like `en` or `es`) to an object of translation
keys and strings. You can override existing keys or add new ones for your own UI. Languages you
don't override fall back to tldraw's defaults.

[4]
Define the components object outside the React component so it's a stable reference. The custom
toolbar is placed in the `TopPanel` slot.

[5]
Pass both the overrides and the components to the `Tldraw` component.

The custom translations also show up in tldraw's own menus. Try creating a shape and right
clicking it to see "Make a copy" and "Remove" in the context menu, or switch the language to
Spanish from the main menu's language submenu to see the `es` overrides.
*/
