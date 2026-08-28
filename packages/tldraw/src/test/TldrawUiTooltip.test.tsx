import { act, render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import {
	TldrawUiTooltip,
	TldrawUiTooltipProvider,
} from '../lib/ui/components/primitives/TldrawUiTooltip'

// The radix half of the tooltip loads lazily (so headless imports stay UI-free). These pin the
// browser side of that split: children must render through the Suspense boundaries, and the
// fallback tooltip must work without the app-level radix provider it once inherited.
describe('TldrawUiTooltip lazy split', () => {
	it('renders trigger children synchronously, before radix resolves, with no provider', async () => {
		const error = vi.spyOn(console, 'error').mockImplementation(() => {})
		try {
			render(
				<TldrawUiTooltip content="hi">
					<button>Trigger</button>
				</TldrawUiTooltip>
			)
			// synchronously: the Suspense fallback renders the children plainly
			expect(screen.getByRole('button', { name: 'Trigger' })).toBeTruthy()

			// after the lazy module resolves, the radix trigger renders the same child once —
			// and its Tooltip.Root must not throw for lack of a radix provider (it carries its own)
			await act(async () => {
				await Promise.resolve()
			})
			expect(await screen.findByRole('button', { name: 'Trigger' })).toBeTruthy()
			expect(screen.getAllByRole('button')).toHaveLength(1)
			expect(error.mock.calls.some((call) => /must be used within/.test(String(call[0])))).toBe(
				false
			)
		} finally {
			error.mockRestore()
		}
	})

	it('does not remount children when the lazy singleton host loads', async () => {
		render(
			<TldrawUiTooltipProvider>
				<div data-testid="app" />
			</TldrawUiTooltipProvider>
		)
		const before = screen.getByTestId('app')
		await act(async () => {
			await Promise.resolve()
		})
		// same DOM node: the radix provider wraps only the singleton, so the lazy load must
		// never unmount the app subtree
		expect(screen.getByTestId('app')).toBe(before)
	})

	it('passes children through untouched when disabled or without content', () => {
		render(
			<TldrawUiTooltip content="">
				<button>Plain</button>
			</TldrawUiTooltip>
		)
		expect(screen.getByRole('button', { name: 'Plain' })).toBeTruthy()
	})
})
