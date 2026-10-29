import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

/** Signed-in edit access: workspace member, or an edit link. */
export function useCanEditFile(fileId?: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'canEditFile',
		() => {
			if (!app || !fileId) return false
			if (app.canUpdateFile(fileId)) return true
			const file = app.getFile(fileId)
			return !!file?.shared && file.sharedLinkType === 'edit'
		},
		[app, fileId]
	)
}
