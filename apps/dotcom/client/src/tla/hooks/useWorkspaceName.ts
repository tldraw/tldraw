import { defineMessages, useTranslation, useValue } from 'tldraw'
import { useApp } from './useAppState'

const messages = defineMessages({
	home: { defaultMessage: 'Home' },
	untitledWorkspace: { defaultMessage: 'Untitled workspace' },
})

export function useWorkspaceName(workspaceId: string) {
	const app = useApp()
	const msg = useTranslation()
	const name = useValue(
		'workspace name',
		() => app.getWorkspaceMembership(workspaceId)?.group?.name,
		[app, workspaceId]
	)
	return (
		name ||
		msg(workspaceId === app.getHomeWorkspaceId() ? messages.home : messages.untitledWorkspace)
	)
}
