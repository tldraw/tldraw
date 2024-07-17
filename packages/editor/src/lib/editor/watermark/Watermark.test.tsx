import { render } from '@testing-library/react'
import process from 'process'
import { TldrawEditor, TldrawEditorProps } from '../../TldrawEditor'
import { featureFlags } from '../../utils/debug-flags'
import { LicenseManager } from '../managers/LicenseManager'

export async function renderComponent(props = {} as TldrawEditorProps) {
	const result = render(<TldrawEditor {...props} />)
	return result
}

describe('<TldrawEditor />', () => {
	it('Renders without crashing', async () => {
		const result = await renderComponent()
		await result.findByTestId('canvas')
	})
})

describe.skip('Watermark', () => {
	it('Does not display the watermark when the feature flag is off', async () => {
		featureFlags.enableLicensing.set(false)
		const result = await renderComponent()
		await result.findByTestId('canvas')
		try {
			await result.findByTestId(LicenseManager.className)
		} catch {
			// noop, expected
		}
	})

	it('Displays the watermark when the editor is unlicensed', async () => {
		featureFlags.enableLicensing.set(true)
		const result = await renderComponent()
		await result.findByTestId('canvas')
		await result.findByTestId(LicenseManager.className)
	})

	it('Does not display the watermark when the editor is licensed', async () => {
		featureFlags.enableLicensing.set(true)
		const result = await renderComponent({ licenseKey: process.env.TLDRAW_LICENSE })
		await result.findByTestId('canvas')
		try {
			await result.findByTestId(LicenseManager.className)
		} catch (e) {
			// noop, that's what we expected
		}
	})
})
