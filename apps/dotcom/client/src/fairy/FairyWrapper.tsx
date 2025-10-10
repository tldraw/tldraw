// lazy load fairy

import { FairyEntity, TldrawFairyAgent } from '@tldraw/dotcom-shared'
import { lazy, Suspense, useMemo } from 'react'
import { Atom } from 'tldraw'

const FairyInner = lazy(() => import('./FairyInner'))

export function FairyWrapper({ agents }: { agents: TldrawFairyAgent[] }) {
	const fairies = useMemo(
		() =>
			agents
				.filter((agent) => agent.$fairy.get() !== undefined)
				.map((agent) => agent.$fairy as Atom<FairyEntity>),
		[agents]
	)

	return (
		<>
			{fairies.map((fairy, i) => (
				<Suspense key={i} fallback={<div />}>
					<FairyInner fairy={fairy} />
				</Suspense>
			))}
		</>
	)
}
