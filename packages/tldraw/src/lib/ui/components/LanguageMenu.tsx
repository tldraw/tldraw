import { defineMessages, LANGUAGES, useMaybeEditor, useValue } from '@tldraw/editor'
import { useUiEvents } from '../context/events'
import { TldrawUiMenuCheckboxItem } from './primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './primitives/menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './primitives/menus/TldrawUiMenuSubmenu'

// Declared here so the English sits with the UI that shows it, and so the extractor can see it.
const messages = defineMessages({
	menuLanguage: { id: 'menu.language', defaultMessage: 'Language' },
})

/** @public @react */
export function LanguageMenu() {
	const editor = useMaybeEditor()
	const trackEvent = useUiEvents()
	const currentLanguage = useValue('locale', () => editor?.user.getLocale(), [editor])

	if (!editor) return null

	return (
		<TldrawUiMenuSubmenu id="help menu language" label={messages.menuLanguage.id}>
			<TldrawUiMenuGroup id="languages" className="tlui-language-menu">
				{LANGUAGES.map(({ locale, label }) => (
					<TldrawUiMenuCheckboxItem
						id={`language-${locale}`}
						lang={locale}
						key={locale}
						title={locale}
						label={label}
						checked={locale === currentLanguage}
						readonlyOk
						onSelect={() => {
							editor.user.updateUserPreferences({ locale })
							trackEvent('change-language', { source: 'menu', locale })
						}}
					/>
				))}
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
