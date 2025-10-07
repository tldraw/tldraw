// lazy load fairy

import { lazy, Suspense } from 'react'

const Fairy = lazy(() => import('./FairyInner'))

function FairyWrapper() {
	return (
		<Suspense fallback={<div />}>
			<Fairy />
		</Suspense>
	)
}

export default FairyWrapper
