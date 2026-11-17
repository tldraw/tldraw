import classNames from 'classnames'
import { getFirstCharacter } from 'tldraw'
import styles from './user-avatar.module.css'

/** The user's initial on their presence color. Callers size it through `className`. */
export function TlaUserAvatar({
	user,
	className,
}: {
	user: { name: string; email: string; color: string }
	className?: string
}) {
	return (
		<div
			className={classNames(styles.avatar, className)}
			style={{ backgroundColor: user.color }}
			aria-hidden
		>
			{getFirstCharacter(user.name || user.email).toUpperCase()}
		</div>
	)
}
