import { Tldraw, TLUserPreferences, uniqueId, useTldrawUser } from 'tldraw'
import 'tldraw/tldraw.css'

export default function SetDefaultLanguageExample() {
	// [1]
	const userPreferences: TLUserPreferences = {
		id: uniqueId(),
		locale: 'es', // [2]
		name: 'Demo User',
		color: '#FF6B6B',
		animationSpeed: 1,
		areKeyboardShortcutsEnabled: true,
		edgeScrollSpeed: 1,
		isSnapMode: false,
		isWrapMode: false,
		isDynamicSizeMode: false,
		isPasteAtCursorMode: false,
		colorScheme: 'light',
	}

	// [3]
	const user = useTldrawUser({ userPreferences })

	return (
		<div className="tldraw__editor">
			{/* [4] */}
			<Tldraw user={user} persistenceKey="set-default-language-example" />
		</div>
	)
}

/*
[1]
Create user preferences with a specific locale. We define all the user preferences including the language setting we want to override.

[2]
Set the locale to 'es' for Spanish. You can use any locale code from the available languages. For example: 'fr' for French, 'de' for German, 'ja' for Japanese, 'zh-cn' for Chinese (Simplified), 'pt-br' for Portuguese (Brazil), etc. See the LANGUAGES constant in @tldraw/editor for all available options.

[3]
Use the useTldrawUser hook to create a user object from our preferences. This hook handles the proper creation of the user with the specified preferences.

[4]
Pass the custom user to the Tldraw component using the user prop. This will override the default language detection behavior and use our specified locale instead.
*/