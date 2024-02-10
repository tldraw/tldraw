import React from 'react'
import { create, StoreApi } from 'zustand'

// This is basically tunnel-rat but with a default initial component.
// Setting the `In` will replace the current `In`, so it does not
// support lists.
// See https://github.com/pmndrs/tunnel-rat for original.

type Props = { hidden?: boolean; children?: React.ReactNode }

type State = {
	current: React.ReactNode
	version: number
	set: StoreApi<State>['setState']
}

export default function tunnel(initial: React.ReactNode) {
	const useStore = create<State>((set) => ({
		current: initial,
		version: 0,
		set,
	}))

	return {
		In: ({ hidden, children }: Props) => {
			const set = useStore((state) => state.set)
			const version = useStore((state) => state.version)

			useIsomorphicLayoutEffect(() => {
				set((state) => ({
					version: state.version + 1,
				}))
			}, [])

			useIsomorphicLayoutEffect(() => {
				set(() => ({
					current: hidden ? null : children,
				}))

				return () =>
					set(() => ({
						current: initial,
					}))
			}, [children, hidden, version])

			return null
		},

		Out: () => {
			const current = useStore((state) => state.current)
			return <>{current}</>
		},
	}
}

/**
 * An SSR-friendly useLayoutEffect.
 *
 * React currently throws a warning when using useLayoutEffect on the server.
 * To get around it, we can conditionally useEffect on the server (no-op) and
 * useLayoutEffect elsewhere.
 *
 * @see https://github.com/facebook/react/issues/14927
 */
export const useIsomorphicLayoutEffect =
	typeof window !== 'undefined' &&
	// eslint-disable-next-line deprecation/deprecation
	(window.document?.createElement || window.navigator?.product === 'ReactNative')
		? React.useLayoutEffect
		: React.useEffect

export function useMutableCallback<T>(fn: T) {
	const ref = React.useRef<T>(fn)
	useIsomorphicLayoutEffect(() => void (ref.current = fn), [fn])
	return ref
}
