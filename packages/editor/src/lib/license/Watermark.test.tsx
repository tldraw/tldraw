import { act, render, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { TldrawEditor } from '../TldrawEditor'
import { LicenseManager } from './LicenseManager'

let mockLicenseState = 'unlicensed'

vi.mock('./useLicenseManagerState', () => ({
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
