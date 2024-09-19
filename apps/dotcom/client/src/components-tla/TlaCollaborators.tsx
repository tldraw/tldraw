import { useValue } from 'tldraw'
import { useApp } from '../hooks/useAppState'
import { useFileCollaborators } from '../tla-hooks/useFileCollaborators'
import { TldrawAppFileId } from '../utils/tla/schema/TldrawAppFile'
import { TldrawAppUserId } from '../utils/tla/schema/TldrawAppUser'

export function TlaCollaborators({ fileId }: { fileId: TldrawAppFileId }) {
	const collaborators = useFileCollaborators(fileId)

	if (collaborators.length === 0) return null

	return (
		<div className="tla-collaborators">
			{collaborators.map((userId) => (
				<TlaCollaborator key={userId} userId={userId} />
			))}
		</div>
	)
}

function TlaCollaborator({ userId }: { userId: TldrawAppUserId }) {
	const app = useApp()
	const user = useValue(
		'user',
		() => {
			const user = app.getUser(userId)
			if (!user) throw Error('no user')
			return user
		},
		[app, userId]
	)
	return (
		<div className="tla-collaborator tla-text_ui__tiny" style={{ backgroundColor: user.color }}>
			{user.name[0]}
		</div>
	)
}
