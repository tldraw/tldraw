import { act, render, waitFor } from '@testing-library/react'
import { TldrawEditor } from '../TldrawEditor'
import { LicenseManager } from './LicenseManager'

let mockLicenseState = 'unlicensed'

jest.mock('../hooks/useLicenseManagerState', () => ({
	useLicenseManagerState: () => mockLicenseState,
}))

describe('Watermark', () => {
	it('Displays the watermark when the editor is unlicensed', async () => {
		mockLicenseState = 'unlicensed'
		const result = await act(async () => render(<TldrawEditor />))
		const elm = await waitFor(() => result.container.querySelector(`.${LicenseManager.className}`))
		expect(elm).not.toBeNull()
	})

	it('Displays the watermark when the editor is licensed with watermark', async () => {
		mockLicenseState = 'licensed-with-watermark'
		const result = await act(async () => render(<TldrawEditor />))
		const elm = await waitFor(() => result.container.querySelector(`.${LicenseManager.className}`))
		expect(elm).not.toBeNull()
	})

	it('Does not display the watermark when the editor is licensed', async () => {
		mockLicenseState = 'licensed'
		const result = await act(async () => render(<TldrawEditor />))
		const elm = await waitFor(() => result.container.querySelector(`.${LicenseManager.className}`))
		expect(elm).toBeNull()
	})
})
