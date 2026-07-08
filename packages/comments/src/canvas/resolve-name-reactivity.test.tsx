import { atom } from '@tldraw/state'
import { act, StrictMode } from 'react'
import { createRoot, Root } from 'react-dom/client'
import { useValue } from 'tldraw'
import { afterEach, describe, expect, it } from 'vitest'

// Regression test for the reactivity fix in comments-overlay.tsx / comments-sidebar.tsx: a
// `resolveName` that reads a signal (e.g. presence, live prefs) must be called inside a tracked
// scope, or the component never re-renders when the underlying signal changes. This mirrors the
// exact pattern used at the real call sites: `useValue('display name', () => resolveName(id), [
// resolveName, id])`.

function DisplayName({ resolveName, id }: { resolveName(id: string): string; id: string }) {
	const name = useValue('display name', () => resolveName(id), [resolveName, id])
	return <span data-testid="name">{name}</span>
}

let container: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
	if (root) {
		act(() => root!.unmount())
		root = null
	}
	if (container) {
		container.remove()
		container = null
	}
})

describe('resolveName reactivity', () => {
	it('re-renders when a resolveName backed by a mutable atom changes', () => {
		const nameAtom = atom('name', 'Someone')
		const resolveName = (_id: string) => nameAtom.get()

		container = document.createElement('div')
		document.body.appendChild(container)
		root = createRoot(container)

		act(() => {
			root!.render(
				<StrictMode>
					<DisplayName resolveName={resolveName} id="user:1" />
				</StrictMode>
			)
		})

		expect(container.querySelector('[data-testid="name"]')?.textContent).toBe('Someone')

		act(() => {
			nameAtom.set('Alice')
		})

		expect(container.querySelector('[data-testid="name"]')?.textContent).toBe('Alice')
	})
})
