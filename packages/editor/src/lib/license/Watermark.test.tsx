import { act, render, waitFor } from '@testing-library/react'
import { featureFlags } from '../utils/debug-flags'
import { LicenseManager } from './LicenseManager'
import { Watermark } from './Watermark'

// Mocking useEditor and licenseContext
jest.mock('../hooks/useEditor', () => ({
	useEditor: () => ({
		getViewportScreenBounds: jest.fn().mockReturnValue({ width: 800 }),
		getInstanceState: jest.fn().mockReturnValue({ isDebugMode: false }),
		getIsMenuOpen: jest.fn().mockReturnValue(false),
	}),
}))

let mockLicenseState = 'unlicensed'
jest.mock('./LicenseProvider', () => ({
	useLicenseContext: jest.fn().mockReturnValue({
		state: { get: () => mockLicenseState },
		async getWatermarkUrl() {
			return ['watermark-desktop.svg', 'watermark-mobile.svg']
		},
	}),
}))

jest.useFakeTimers()

export async function renderComponent() {
	const result = render(<Watermark />)
	jest.advanceTimersByTime(3000)
	return result
}

describe('Watermark', () => {
	beforeEach(() => {
		jest.mock('./LicenseProvider', () => ({
			useLicenseContext: jest.fn().mockReturnValue({ state: { get: () => mockLicenseState } }),
		}))
	})

	it('Does not display the watermark when the feature flag is off', async () => {
		featureFlags.enableLicensing.set(false)
		// need to wrap in act to avoid warning
		const result = await act(renderComponent)

		expect(result.container.firstChild).toBeNull()
	})

	it('Displays the watermark when the editor is unlicensed', async () => {
		featureFlags.enableLicensing.set(true)
		const result = await act(renderComponent)

		// Don't wanna put a data-testid here - makes it too easy to querySelect on.
		await waitFor(() =>
			expect((result.container.firstChild! as Element)!.nextElementSibling!.className).toBe(
				LicenseManager.className
			)
		)
	})

	it('Displays the watermark when the editor is licensed with watermark', async () => {
		featureFlags.enableLicensing.set(true)

		mockLicenseState = 'licensed-with-watermark'
		const result = await act(renderComponent)

		// Don't wanna put a data-testid here - makes it too easy to querySelect on.
		await waitFor(() =>
			expect((result.container.firstChild! as Element)!.nextElementSibling!.className).toBe(
				LicenseManager.className
			)
		)
	})

	it('Does not display the watermark when the editor is licensed', async () => {
		mockLicenseState = 'licensed'

		featureFlags.enableLicensing.set(true)
		const result = await renderComponent()
		expect(result.container.firstChild).toBeNull()
	})
})
