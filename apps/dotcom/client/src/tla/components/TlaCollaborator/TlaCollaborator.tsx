import classNames from 'classnames'
import styles from './collaborator.module.css'

export function TlaCollaborator({
	size,
	idle,
	testId = 'collaborator',
}: {
	size: 'small' | 'medium' | 'large'
	idle: boolean
	testId?: string
}) {
	return (
		<div
			data-testid={testId}
			className={classNames({
				[styles.collaboratorSmall]: size === 'small',
				[styles.collaboratorMedium]: size === 'medium',
				[styles.collaboratorLarge]: size === 'large',
				[styles.idle]: idle,
			})}
		/>
	)
}
