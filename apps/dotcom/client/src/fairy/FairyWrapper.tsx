// lazy load fairy

import { lazy, Suspense } from 'react'
import { atom, VecModel } from 'tldraw'

const FairyInner = lazy(() => import('./FairyInner'))

export interface FairyEntity {
	position: VecModel
	flipX: boolean
}

const $theOnlyFairy = atom<FairyEntity>(
	'the-only-fairy',
	{
		position: { x: 0, y: 0 },
		flipX: false,
	},
	{}
)

export function FairyWrapper() {
	return (
		<Suspense fallback={<div />}>
			<FairyInner fairy={$theOnlyFairy.get()} />
		</Suspense>
	)
}
