import styles from './collaborator.module.css'

export function TlaCollaborator({ size }: { size: 'small' | 'medium' | 'large' }) {
	return (
		<div
			className={
				size === 'small'
					? styles.collaboratorSmall
					: size === 'medium'
						? styles.collaboratorMedium
						: styles.collaboratorLarge
			}
		/>
	)
}
