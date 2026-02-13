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
We create a custom toolbar component that will use the translation system. The useTranslation
hook returns a function (commonly named 'msg') that retrieves translated strings by their key.

[2]
We call the msg function with translation keys like 'action.duplicate' and 'action.delete'.
These will return our customized strings instead of tldraw's defaults.

[3]
We define translation overrides in the overrides object. The translations property accepts an
object where each key is a language code (like 'en' or 'es') and the value is an object mapping
translation keys to custom strings. This allows you to override existing translations or add
new ones for multiple languages.

[4]
We define our component overrides outside of the React component to keep them static. This
prevents unnecessary re-renders and follows React best practices. The CustomToolbar component
is placed in the TopPanel to demonstrate how custom UI can use the translation system.

[5]
We pass both the overrides and components to the Tldraw component. The overrides provide the
custom translations, and the components prop adds our custom toolbar that uses those translations.

In addition to our custom menu, our custom translations can be found in the other menus as well.
Try creating a shape and right clicking it to see the custom translations in the context menu, or
in the main menu, keyboard shortcuts dialog, and more.
*/
