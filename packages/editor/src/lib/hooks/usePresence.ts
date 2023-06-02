import { TLInstancePresence } from '@tldraw/tlschema'
import { useMemo } from 'react'
import { useValue } from 'signia-react'
import { useApp } from './useEditor'

// TODO: maybe move this to a computed property on the App class?
/**
 * @returns The list of peer UserIDs
 * @internal
 */
export function usePresence(userId: string): TLInstancePresence | null {
	const app = useApp()

	const $presences = useMemo(() => {
		return app.store.query.records('instance_presence', () => ({
			userId: { eq: userId },
		}))
	}, [app, userId])

	const latestPresence = useValue(
		`latestPresence:${userId}`,
		() => {
			return $presences.value
				.slice()
				.sort((a, b) => b.lastActivityTimestamp - a.lastActivityTimestamp)[0]
		},
		[]
	)

	return latestPresence ?? null
}
