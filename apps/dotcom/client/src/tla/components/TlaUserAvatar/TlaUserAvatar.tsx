import classNames from 'classnames'
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
			{(user.name || user.email).charAt(0).toUpperCase()}
		</div>
	)
}
