// lazy load fairy

import { FairyEntity } from '@tldraw/dotcom-shared'
import { lazy, Suspense } from 'react'
import { atom } from 'tldraw'

const FairyInner = lazy(() => import('./FairyInner'))

export const $theOnlyFairy = atom<FairyEntity>(
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
			<FairyInner fairy={$theOnlyFairy} />
		</Suspense>
	)
}
