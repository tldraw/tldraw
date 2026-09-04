import { act, render } from '@testing-library/react'
import { LicenseManager } from './LicenseManager'
import { LicenseProvider, useLicenseContext } from './LicenseProvider'

describe('LicenseProvider', () => {
	it('creates a new license manager when the license key changes', async () => {
		const managers: LicenseManager[] = []
		function Probe() {
			managers.push(useLicenseContext())
			return null
		}
		const renderWithKey = (licenseKey: string | undefined) => (
			<LicenseProvider licenseKey={licenseKey}>
				<Probe />
			</LicenseProvider>
		)

		const rendered = await act(async () => render(renderWithKey(undefined)))
		const initial = managers.at(-1)!

		await act(async () => rendered.rerender(renderWithKey('not-a-real-key')))
		const changed = managers.at(-1)!
		expect(changed).not.toBe(initial)

		// same key again: the manager is stable
		await act(async () => rendered.rerender(renderWithKey('not-a-real-key')))
		expect(managers.at(-1)).toBe(changed)
	})
})
