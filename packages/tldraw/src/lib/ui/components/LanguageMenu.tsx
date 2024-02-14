import { useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLUiTranslation } from '../hooks/useTranslation/translations'
import { useLanguages } from '../hooks/useTranslation/useLanguages'
import { TldrawUiMenuCheckboxItem } from './menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuGroup } from './menus/TldrawUiMenuGroup'
import { TldrawUiMenuSubmenu } from './menus/TldrawUiMenuSubmenu'

export function LanguageMenu() {
	const editor = useEditor()
	const { languages, currentLanguage } = useLanguages()

	const handleLanguageSelect = useCallback(
		(locale: TLUiTranslation['locale']) => editor.user.updateUserPreferences({ locale }),
		[editor]
	)

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
						onSelect={() => handleLanguageSelect(locale)}
					/>
				))}
			</TldrawUiMenuGroup>
		</TldrawUiMenuSubmenu>
	)
}
