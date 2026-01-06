import { LANGUAGES, TLComponents, Tldraw, useEditor, useValue } from 'tldraw'
import 'tldraw/tldraw.css'

function LanguagePicker() {
	const editor = useEditor()

	// [1]
	const currentLocale = useValue('locale', () => editor.user.getLocale(), [editor])

	return (
		<select
			style={{ pointerEvents: 'all' }}
			value={currentLocale}
			onChange={(e) => {
				// [2]
				editor.user.updateUserPreferences({ locale: e.target.value })
			}}
		>
			{/* [3] */}
			{LANGUAGES.map(({ locale, label }) => (
				<option key={locale} value={locale}>
					{label}
				</option>
			))}
		</select>
	)
}

const components: TLComponents = {
	TopPanel: LanguagePicker,
}

export default function LanguagePickerExample() {
	return (
		<div className="tldraw__editor">
			<Tldraw components={components} />
		</div>
	)
}

/*
[1]
Get the current locale using `editor.user.getLocale()`. The locale is a string like
'en', 'fr', 'de', etc.

[2]
Update the locale by calling `editor.user.updateUserPreferences()`. This will update
the UI language and persist the preference to local storage.

[3]
The `LANGUAGES` constant contains all available languages with their locale codes
and display labels.
*/
