import { defineMessages, useTranslation, useValue } from 'tldraw'
import { useApp } from './useAppState'

const messages = defineMessages({
	myWorkspace: { defaultMessage: 'My workspace' },
	untitledWorkspace: { defaultMessage: 'Untitled workspace' },
})

/** A workspace's display name, falling back to "My workspace" for an unnamed home workspace. */
export function useWorkspaceName(workspaceId: string) {
	const app = useApp()
	const msg = useTranslation()
	const name = useValue(
		'workspace name',
		() => app.getWorkspaceMembership(workspaceId)?.group?.name,
		[app, workspaceId]
	)
	if (name) return name
	return msg(
		workspaceId === app.getHomeWorkspaceId() ? messages.myWorkspace : messages.untitledWorkspace
	)
}
