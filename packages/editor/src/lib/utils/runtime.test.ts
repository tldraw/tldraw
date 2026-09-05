import { vi } from 'vitest'
import { hardResetEditor, openWindow, refreshPage, runtime, setRuntimeOverrides } from './runtime'
import { hardReset } from './sync/hardReset'

vi.mock('./sync/hardReset', () => ({ hardReset: vi.fn(async () => {}) }))

describe('runtime', () => {
	const original = { ...runtime }

	afterEach(() => {
		setRuntimeOverrides(original)
		vi.restoreAllMocks()
		vi.mocked(hardReset).mockClear()
	})

	describe('openWindow', () => {
		it('opens a window without a referrer by default', () => {
			const open = vi.spyOn(window, 'open').mockReturnValue(null)
			openWindow('https://example.com')
			expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener noreferrer')
		})

		it('keeps the referrer when allowReferrer is set', () => {
			const open = vi.spyOn(window, 'open').mockReturnValue(null)
			openWindow('https://example.com', '_self', true)
			expect(open).toHaveBeenCalledWith('https://example.com', '_self', 'noopener')
		})
	})

	describe('refreshPage', () => {
		it('delegates to the runtime implementation', () => {
			const refresh = vi.fn()
			setRuntimeOverrides({ refreshPage: refresh })
			refreshPage()
			expect(refresh).toHaveBeenCalledTimes(1)
		})
	})

	describe('hardResetEditor', () => {
		it('hard resets with a reload by default', () => {
			hardResetEditor()
			expect(hardReset).toHaveBeenCalledWith({ shouldReload: true })
		})

		it('delegates to an overridden implementation', () => {
			const reset = vi.fn(async () => {})
			setRuntimeOverrides({ hardReset: reset })
			hardResetEditor()
			expect(reset).toHaveBeenCalledTimes(1)
			expect(hardReset).not.toHaveBeenCalled()
		})
	})

	describe('setRuntimeOverrides', () => {
		it('replaces only the provided entries', () => {
			const open = vi.fn()
			setRuntimeOverrides({ openWindow: open })
			expect(runtime.openWindow).toBe(open)
			expect(runtime.refreshPage).toBe(original.refreshPage)
			expect(runtime.hardReset).toBe(original.hardReset)

			openWindow('https://example.com', 'tab')
			expect(open).toHaveBeenCalledWith('https://example.com', 'tab', undefined)
		})
	})
})
