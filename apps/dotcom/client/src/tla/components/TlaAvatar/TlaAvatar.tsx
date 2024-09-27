import classNames from 'classnames'
import { HTMLAttributes } from 'react'
import styles from './avatar.module.css'

export function TlaAvatar({
	size = 's',
	...props
}: HTMLAttributes<HTMLDivElement> & { size?: 's' | 'm' | 'l' }) {
	return <div {...props} className={classNames(styles.avatar, props.className)} data-size={size} />
}
