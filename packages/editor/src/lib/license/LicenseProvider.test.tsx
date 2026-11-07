import { act, render } from '@testing-library/react'
import { vi } from 'vitest'
import { LicenseFromKeyResult, LicenseManager } from './LicenseManager'
import { LICENSE_TIMEOUT, LicenseProvider, useLicenseContext } from './LicenseProvider'

const NO_KEY: LicenseFromKeyResult = { isLicenseParseable: false, reason: 'no-key-provided' }

describe('LicenseProvider', () => {
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

	beforeEach(() => {
		managers.length = 0
	})
	afterEach(() => {
		vi.restoreAllMocks()
		vi.useRealTimers()
	})

	it('creates a new license manager when the license key changes', async () => {
		const rendered = await act(async () => render(renderWithKey(undefined)))
		const initial = managers.at(-1)!

		await act(async () => rendered.rerender(renderWithKey('not-a-real-key')))
		const changed = managers.at(-1)!
		expect(changed).not.toBe(initial)

		// same key again: the manager is stable
		await act(async () => rendered.rerender(renderWithKey('not-a-real-key')))
		expect(managers.at(-1)).toBe(changed)
	})

	it('shows the editor again when a new key arrives after the gate closed', async () => {
		// validation never settles so the test drives the state by hand
		vi.spyOn(LicenseManager.prototype, 'getLicenseFromKey').mockReturnValue(new Promise(() => {}))
		vi.useFakeTimers()

		const rendered = await act(async () => render(renderWithKey('expired-key')))
		const expired = managers.at(-1)!
		act(() => expired.state.set('expired'))
		act(() => vi.advanceTimersByTime(LICENSE_TIMEOUT))
		expect(rendered.queryByTestId('tl-license-expired')).not.toBeNull()

		await act(async () => rendered.rerender(renderWithKey('fresh-key')))
		expect(rendered.queryByTestId('tl-license-expired')).toBeNull()
		expect(managers.at(-1)).not.toBe(expired)
	})

	it('ignores the validation result of a manager replaced by a new key', async () => {
		const resolvers: ((result: LicenseFromKeyResult) => void)[] = []
		vi.spyOn(LicenseManager.prototype, 'getLicenseFromKey').mockImplementation(
			() => new Promise((resolve) => resolvers.push(resolve))
		)
		const track = vi.spyOn(LicenseManager.prototype as any, 'maybeTrack')

		const rendered = await act(async () => render(renderWithKey(undefined)))
		const orphan = managers.at(-1)!
		await act(async () => rendered.rerender(renderWithKey('real-key')))
		expect(managers.at(-1)).not.toBe(orphan)

		await act(async () => resolvers[0](NO_KEY))
		expect(orphan.state.get()).toBe('pending')
		expect(track).not.toHaveBeenCalled()

		await act(async () => resolvers[1](NO_KEY))
		expect(managers.at(-1)!.state.get()).toBe('unlicensed')
	})
})
