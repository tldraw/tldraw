import { useValue } from 'tldraw'
import { useApp } from './useAppState'

export function useIsDragging(fileOrWorkspaceId: string) {
	const app = useApp()
	return useValue(
		'isDragging:' + fileOrWorkspaceId,
		() =>
			app.sidebarState.get().dragState?.hasDragStarted &&
			app.sidebarState.get().dragState?.id === fileOrWorkspaceId,
		[fileOrWorkspaceId, app]
	)
}
