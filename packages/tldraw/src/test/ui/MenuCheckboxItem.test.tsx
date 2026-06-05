import { render, screen } from '@testing-library/react'
import { DropdownMenu as _DropdownMenu } from 'radix-ui'
import { defaultUiAssetUrls } from '../../lib/ui/assetUrls'
import { TldrawUiMenuCheckboxItem } from '../../lib/ui/components/primitives/menus/TldrawUiMenuCheckboxItem'
import { TldrawUiMenuContextProvider } from '../../lib/ui/components/primitives/menus/TldrawUiMenuContext'
import { TldrawUiTooltipProvider } from '../../lib/ui/components/primitives/TldrawUiTooltip'
import { AssetUrlsProvider } from '../../lib/ui/context/asset-urls'
import { TldrawUiTranslationProvider } from '../../lib/ui/hooks/useTranslation/useTranslation'

const label = 'Select on wrap'
const description = 'Select shapes only when the selection box fully encloses them.'

it('exposes checkbox descriptions via aria-describedby', () => {
	render(
		<AssetUrlsProvider assetUrls={defaultUiAssetUrls}>
			<TldrawUiTranslationProvider locale="en">
				<TldrawUiTooltipProvider>
					<_DropdownMenu.Root open>
						<_DropdownMenu.Trigger>Open</_DropdownMenu.Trigger>
						<_DropdownMenu.Content>
							<TldrawUiMenuContextProvider type="menu" sourceId="main-menu">
								<TldrawUiMenuCheckboxItem
									id="toggle-wrap-mode"
									label={label}
									description={description}
									onSelect={() => {}}
								/>
							</TldrawUiMenuContextProvider>
						</_DropdownMenu.Content>
					</_DropdownMenu.Root>
				</TldrawUiTooltipProvider>
			</TldrawUiTranslationProvider>
		</AssetUrlsProvider>
	)

	const item = screen.getByRole('menuitemcheckbox')
	const describedBy = item.getAttribute('aria-describedby')
	expect(describedBy).toBeTruthy()
	if (!describedBy) throw new Error('Expected aria-describedby on the menu item')

	const descriptionElement = document.getElementById(describedBy)
	expect(descriptionElement).not.toBeNull()
	expect(descriptionElement?.textContent).toBe(description)
	expect(item.getAttribute('title')).toBeNull()
})
