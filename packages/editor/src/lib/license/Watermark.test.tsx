import { act, render, waitFor } from '@testing-library/react'
import { TldrawEditor } from '../TldrawEditor'
import { LicenseManager } from './LicenseManager'

// Mocking useEditor and licenseContext
jest.mock('../hooks/useEditor', () => ({
	useEditor: () => ({
		getViewportScreenBounds: jest.fn().mockReturnValue({ width: 800 }),
		getInstanceState: jest.fn().mockReturnValue({ isDebugMode: false }),
		environment: jest.fn().mockReturnValue({
			isSafari: true,
			isIos: false,
			isChromeForIos: false,
			isFirefox: false,
			isAndroid: false,
			isWebview: false,
		}),
	}),
}))

let mockLicenseState = 'unlicensed'

jest.mock('./useLicenseManagerState', () => ({
	useLicenseManagerState: () => mockLicenseState,
}))

async function renderEditorAndGetWatermarkElement() {
	const result = await act(async () => render(<TldrawEditor />))
	return await waitFor(() => result.container.querySelector(`.${LicenseManager.className}`))
}

describe('Watermark', () => {
	it('Displays the watermark when the editor is unlicensed', async () => {
		mockLicenseState = 'unlicensed'
		expect(await renderEditorAndGetWatermarkElement()).not.toBeNull()
	})

	it('Displays the watermark when the editor is licensed with watermark', async () => {
		mockLicenseState = 'licensed-with-watermark'
		expect(await renderEditorAndGetWatermarkElement()).not.toBeNull()
	})

	it('Does not display the watermark when the editor is licensed', async () => {
		mockLicenseState = 'licensed'
		expect(await renderEditorAndGetWatermarkElement()).toBeNull()
	})
})
