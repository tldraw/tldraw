import { useValue } from 'tldraw'
import { useApp } from './useAppState'

export function useIsDragging(fileOrGroupId: string) {
	const app = useApp()
	return useValue(
		'isDragging:' + fileOrGroupId,
		() =>
			app.sidebarState.get().dragState?.hasDragStarted &&
			app.sidebarState.get().dragState?.id === fileOrGroupId,
		[fileOrGroupId, app]
	)
}
