import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultUiAssetUrls } from '../../assetUrls'
import { AssetUrlsProvider } from '../../context/asset-urls'
import { TldrawUiIcon } from './TldrawUiIcon'

function maskOf(container: HTMLElement) {
	return container.querySelector<HTMLElement>('.tlui-icon')!.getAttribute('style')
}

describe('TldrawUiIcon', () => {
	it('uses the default icon urls when rendered outside an AssetUrlsProvider', () => {
		const { container } = render(<TldrawUiIcon icon="check" label="Check" />)
		expect(maskOf(container)).toContain(defaultUiAssetUrls.icons.check)
	})

	it('uses the provided icon urls inside an AssetUrlsProvider', () => {
		const assetUrls = {
			...defaultUiAssetUrls,
			icons: { ...defaultUiAssetUrls.icons, check: 'https://example.com/check.svg' },
		}
		const { container } = render(
			<AssetUrlsProvider assetUrls={assetUrls}>
				<TldrawUiIcon icon="check" label="Check" />
			</AssetUrlsProvider>
		)
		expect(maskOf(container)).toContain('https://example.com/check.svg')
	})
})
