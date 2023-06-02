import uniq from 'lodash.uniq'
import { useMemo } from 'react'
import { useComputed, useValue } from 'signia-react'
import { useApp } from './useEditor'

// TODO: maybe move this to a computed property on the App class?
/**
 * @returns The list of peer UserIDs
 * @internal
 */
export function usePeerIds() {
	const app = useApp()
	const $presences = useMemo(() => {
		return app.store.query.records('instance_presence', () => ({ userId: { neq: app.user.id } }))
	}, [app])

	const $userIds = useComputed(
		'userIds',
		() => uniq($presences.value.map((p) => p.userId)).sort(),
		{ isEqual: (a, b) => a.join(',') === b.join?.(',') },
		[$presences]
	)

	return useValue($userIds)
}
