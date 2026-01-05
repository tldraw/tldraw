import { LANGUAGES, TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

// [1]
function LanguagePicker() {
	const editor = useEditor()

	// [2]
	const currentLocale = useValue('locale', () => editor.user.getLocale(), [editor])

	return (
		<select
			style={{ pointerEvents: 'all' }}
			value={currentLocale}
			onChange={(e) => {
				// [3]
				editor.user.updateUserPreferences({ locale: e.target.value })
			}}
		>
			{/* [4] */}
			{LANGUAGES.map(({ locale, label }) => (
				<option key={locale} value={locale}>
					{label}
				</option>
			))}
		</select>
	)
}

// [5]
const components: TLComponents = {
	TopPanel: LanguagePicker,
}

export default function LanguagePickerExample() {
	return (
		<div className="tldraw__editor">
			{/* [6] */}
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
Create a language picker component. Since it's rendered via the `components` prop,
it has access to `useEditor()` without needing an EditorProvider wrapper.

[2]
Use `useValue` to reactively read the current locale. This hook will automatically
re-render the component when the locale changes. The first argument is a debug name,
the second is a function that returns the value to track, and the third is a dependency array.

[3]
Update the locale by calling `editor.user.updateUserPreferences()`. This will update
the editor's internal state and persist the preference to local storage.

[4]
The `LANGUAGES` constant contains all available languages with their locale codes and
display labels. Each entry has a `locale` (e.g., 'en', 'fr') and a `label` (e.g.,
'English', 'Français').

[5]
Define your component overrides outside of the React component so that they're static.
Here we replace the TopPanel with our language picker.

[6]
Pass the components to the `components` prop. The language picker will be rendered
in the top panel area of the editor.

*/
