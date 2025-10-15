import { FairyEntity, TldrawFairyAgent } from '@tldraw/fairy-shared'
import { useMemo } from 'react'
import { Atom } from 'tldraw'
import FairyInner from './FairyInner'

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
				<FairyInner key={i} fairy={fairy} />
			))}
		</>
	)
}
