import { useParams } from 'react-router-dom'
import { useValue } from 'tldraw'
import { useApp } from './useAppState'

/**
 * The active workspace ("group") is derived from the file that's currently open,
 * not stored separately. We resolve it from the file in the URL and fall back to
 * the user's home group ("My files").
 */
export function useActiveGroupId() {
	const app = useApp()
	const { fileSlug } = useParams<{ fileSlug: string }>()
	return useValue(
		'activeGroupId',
		() => {
			if (fileSlug) {
				const file = app.getFile(fileSlug)
				if (file?.owningGroupId) return file.owningGroupId
			}
			return app.getHomeGroupId()
		},
		[app, fileSlug]
	)
}
