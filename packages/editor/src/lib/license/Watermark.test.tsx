import { act, render, waitFor } from '@testing-library/react'
import { TldrawEditor } from '../TldrawEditor'
import { LicenseManager } from './LicenseManager'

let mockLicenseState = 'unlicensed'

jest.mock('../hooks/useLicenseManagerState', () => ({
	useLicenseManagerState: () => mockLicenseState,
}))

async function renderWithMockedLicenseState() {
	const result = await act(async () => render(<TldrawEditor />))
	const elm = await waitFor(() => result.container.querySelector(`.${LicenseManager.className}`))
	return elm
}

describe('Watermark', () => {
	it('Displays the watermark when the editor is unlicensed', async () => {
		mockLicenseState = 'unlicensed'
		expect(await renderWithMockedLicenseState()).not.toBeNull()
	})

	it('Displays the watermark when the editor is licensed with watermark', async () => {
		mockLicenseState = 'licensed-with-watermark'
		expect(await renderWithMockedLicenseState()).not.toBeNull()
	})

	it('Does not display the watermark when the editor is licensed', async () => {
		mockLicenseState = 'licensed'
		expect(await renderWithMockedLicenseState()).toBeNull()
	})
})
