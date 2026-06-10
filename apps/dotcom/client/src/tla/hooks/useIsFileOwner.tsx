import { can } from '@tldraw/dotcom-shared'
import { useValue } from 'tldraw'
import { useMaybeApp } from './useAppState'

export function useHasFileAdminRights(fileId?: string): boolean {
	const app = useMaybeApp()
	return useValue(
		'isOwner',
		() => {
			if (!app) return false
			if (!fileId) return false
			const file = app?.getFile(fileId)
			if (!file) return false
			if (file.ownerId) return file.ownerId === app.userId
			if (file.owningGroupId) {
				const role = app.getGroupMembership(file.owningGroupId)?.role
				return can(role, 'accessFiles')
			}
			return false
		},
		[app, fileId]
	)
}
