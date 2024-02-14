import { useEditor } from '@tldraw/editor'
import { useLanguages } from '../hooks/useTranslation/useLanguages'
import { useUiEvents } from '../ui-context/events'
import { TldrawUiMenuCheckboxItem } from './menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './menus/TldrawUiMenuSubmenu'

export function LanguageMenu() {
	const editor = useEditor()
	const trackEvent = useUiEvents()
	const { languages, currentLanguage } = useLanguages()

	return (
		<TldrawUiMenuSubmenu id="help menu language" label="menu.language">
			<TldrawUiMenuGroup id="languages">
				{languages.map(({ locale, label }) => (
					<TldrawUiMenuCheckboxItem
						id={`language-${locale}`}
						key={locale}
						title={locale}
						label={label}
						checked={locale === currentLanguage}
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
