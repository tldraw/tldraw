import React, { useLayoutEffect } from 'react'
import { create, StoreApi } from 'zustand'

// This is basically tunnel-rat but with a default initial component.
// Setting the `In` will replace the current `In`, so it does not
// support lists. We should consider replacing this with a context-based
// solution so that we can support unique tunnels per component; at the moment
// applying any custom ui override with this tunnel will result in all
// instances having the same custom ui elements.
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

			useLayoutEffect(() => {
				set((state) => ({
					version: state.version + 1,
				}))
			}, [set])

			useLayoutEffect(() => {
				set(() => ({
					current: hidden ? null : children,
				}))

				return () =>
					set(() => ({
						current: initial,
					}))
			}, [set, children, hidden, version])

			return null
		},

		Out: () => {
			const current = useStore((state) => state.current)
			return <>{current}</>
		},
	}
}
