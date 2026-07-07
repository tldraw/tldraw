import { CanvasComments } from '@tldraw/commenting/canvas'
import { useCallback } from 'react'
import { useEditor, useValue } from 'tldraw'
import { useMaybeApp } from '../../hooks/useAppState'

/**
 * dotcom's comments layer: a thin consumer of `@tldraw/commenting/canvas`'s `<CanvasComments>`.
 * All the flow (tool, pins, thread popovers, composer, rich-text bodies) lives in the toolkit;
 * dotcom only supplies the pieces that are its own — the signed-in user's id and a name resolver
 * (current user from preferences, others from live presence).
 */
export function CommentsOnCanvas() {
	const editor = useEditor()
	const app = useMaybeApp()
	const currentUserId = app?.userId ?? null

	const currentUserName = useValue(
		'current user name',
		() => {
			if (!app) return 'You'
			return app.tlUser.userPreferences.get().name || 'You'
		},
		[app]
	)
	const presenceNames = useValue(
		'presence names',
		() => {
			const names = new Map<string, string>()
			for (const p of editor.store.query.records('instance_presence').get()) {
				if (p.userName) names.set(p.userId.replace(/^user:/, ''), p.userName)
			}
			return names
		},
		[editor]
	)
	const resolveName = useCallback(
		(id: string) => (id === currentUserId ? currentUserName : (presenceNames.get(id) ?? 'Someone')),
		[currentUserId, currentUserName, presenceNames]
	)

	return <CanvasComments currentUserId={currentUserId} resolveName={resolveName} />
}
