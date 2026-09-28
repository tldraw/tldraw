import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useHasFileAdminRights(fileId?: string): boolean {
	const app = useMaybeApp()
	return useValue('hasFileAdminRights', () => !!(app && fileId) && app.canUpdateFile(fileId), [
		app,
		fileId,
	])
}
