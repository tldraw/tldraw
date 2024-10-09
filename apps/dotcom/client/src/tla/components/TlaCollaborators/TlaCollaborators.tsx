import classNames from 'classnames'
import { useFileCollaborators } from '../../hooks/useFileCollaborators'
import { db } from '../../utils/db'
import { TldrawAppFile, TldrawAppUser } from '../../utils/db-schema'
import styles from './collaborators.module.css'

export function TlaCollaborators({ fileId }: { fileId: TldrawAppFile['id'] }) {
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

function TlaCollaborator({ userId }: { userId: TldrawAppUser['id'] }) {
	const userResp = db.useQuery({
		users: {
			$: {
				where: {
					id: userId,
				},
			},
		},
	})

	if (userResp.isLoading) return null

	const user = userResp.data?.users[0]

	if (!user) return null

	return (
		<div
			className={classNames(styles.collaborator, 'tla-text_ui__tiny')}
			style={{ backgroundColor: user.color }}
		>
			{user.name[0]}
		</div>
	)
}
