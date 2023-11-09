import { useEditor } from '@tldraw/editor'
import { useCallback } from 'react'
import { TLUiTranslation } from '../hooks/useTranslation/translations'
import { useLanguages } from '../hooks/useTranslation/useLanguages'
import * as D from './primitives/DropdownMenu'

export function LanguageMenu() {
	const editor = useEditor()
	const { languages, currentLanguage } = useLanguages()

	const handleLanguageSelect = useCallback(
		(locale: TLUiTranslation['locale']) => editor.user.updateUserPreferences({ locale }),
		[editor]
	)

	return (
		<D.Sub id="help menu language">
			<D.SubTrigger label="menu.language" data-direction="left" />
			<D.SubContent sideOffset={-4}>
				<D.Group>
					{languages.map(({ locale, label }) => (
						<D.RadioItem
							key={locale}
							title={locale}
							checked={locale === currentLanguage}
							onSelect={() => handleLanguageSelect(locale)}
						>
							<span className="tlui-button__label">{label}</span>
						</D.RadioItem>
					))}
				</D.Group>
				{/* <DropdownMenu.Group>
					<Button label="translation-link" icon="external" />
				</DropdownMenu.Group> */}
			</D.SubContent>
		</D.Sub>
	)
}
