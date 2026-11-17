import { defineMessages, useTranslation, useValue } from 'tldraw'
import { useApp } from './useAppState'

const messages = defineMessages({
	home: { defaultMessage: 'Home' },
	untitledWorkspace: { defaultMessage: 'Untitled workspace' },
})

/** A workspace's display name. The home workspace is always "Home", whatever its group is named. */
export function useWorkspaceName(workspaceId: string) {
	const app = useApp()
	const msg = useTranslation()
	const name = useValue(
		'workspace name',
		() =>
			workspaceId === app.getHomeWorkspaceId()
				? null
				: app.getWorkspaceMembership(workspaceId)?.group?.name,
		[app, workspaceId]
	)
	if (name === null) return msg(messages.home)
	return name || msg(messages.untitledWorkspace)
}
