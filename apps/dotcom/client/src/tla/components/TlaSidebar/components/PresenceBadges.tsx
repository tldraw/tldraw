import { useValue } from 'tldraw'
import { useApp } from '../../../hooks/useAppState'

interface PresenceBadgesProps {
	fileId: string
	className?: string
	badgeClassName?: string
}

export function PresenceBadges({ fileId, className, badgeClassName }: PresenceBadgesProps) {
	const app = useApp()
	const presences = useValue(
		'presences',
		() => app.getPresences(fileId).filter((p) => p.userId !== app.userId),
		[fileId, app]
	)

	if (presences.length === 0) {
		return null
	}

	return (
		<div className={className}>
			{presences.map((presence) => (
				<div key={presence.userId} className={badgeClassName}>
					<div
						style={{
							width: 16,
							height: 16,
							borderRadius: '50%',
							backgroundColor: presence.color ?? 'var(--tla-color-contrast)',
							border: '2px solid var(--tla-color-contrast)',
							marginLeft: -4, // Creates overlap between badges
						}}
					/>
				</div>
			))}
		</div>
	)
}
