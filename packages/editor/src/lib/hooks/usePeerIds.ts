import { useAtom, useComputed, useValue } from '@tldraw/state-react'
import { useEffect } from 'react'
import {
	getCollaboratorStateFromElapsedTime,
	shouldShowCollaborator,
} from '../utils/collaboratorState'
import { uniq } from '../utils/uniq'
import { useEditor } from './useEditor'

function setsEqual<T>(a: Set<T>, b: Set<T>): boolean {
	if (a.size !== b.size) return false
	for (const item of a) {
		if (!b.has(item)) return false
	}
	return true
}

// TODO: maybe move this to a computed property on the App class?
/**
 * @returns The list of peer UserIDs
 * @public
 */
export function usePeerIds() {
	const editor = useEditor()

	const $userIds = useComputed(
		'userIds',
		() => uniq(editor.getCollaborators().map((p) => p.userId)).sort(),
		{ isEqual: (a, b) => a.join(',') === b.join?.(',') },
		[editor]
	)

	return useValue($userIds)
}

/**
 * Returns a computed signal of active peer user IDs that should be shown.
 * Automatically re-evaluates on an interval to handle time-based state transitions
 * (active -> idle -> inactive).
 *
 * @returns A computed signal containing a Set of active peer user IDs
 * @internal
 */
export function useActivePeerIds$() {
	const $time = useAtom('peerIdsTime', Date.now())
	const editor = useEditor()
	useEffect(() => {
		const interval = editor.timers.setInterval(() => {
			$time.set(Date.now())
		}, editor.options.collaboratorCheckIntervalMs)

		return () => clearInterval(interval)
	}, [editor, $time])

	return useComputed(
		'activePeerIds',
		() => {
			const now = $time.get()
			return new Set(
				editor
					.getCollaborators()
					.filter((p) => {
						const elapsed = Math.max(0, now - (p.lastActivityTimestamp ?? Infinity))
						const state = getCollaboratorStateFromElapsedTime(editor, elapsed)
						return shouldShowCollaborator(editor, p, state)
					})
					.map((p) => p.userId)
			)
		},
		{ isEqual: setsEqual },
		[editor]
	)
}
