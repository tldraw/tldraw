import { TldrawAppFileId, TldrawAppUserId } from '@tldraw/dotcom-shared'
import classNames from 'classnames'
import { useValue } from 'tldraw'
import { useApp } from '../../hooks/useAppState'
import { useFileCollaborators } from '../../hooks/useFileCollaborators'
import styles from './collaborators.module.css'

export function TlaCollaborators({ fileId }: { fileId: TldrawAppFileId }) {
	const collaborators = useFileCollaborators(fileId)

	if (collaborators.length === 0) return null

	return (
		<div className={styles.collaborators}>
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
		<div
			className={classNames(styles.collaborator, 'tla-text_ui__tiny')}
			style={{ backgroundColor: user.color }}
		>
			{user.name[0]}
		</div>
	)
}
