import classNames from 'classnames'
import { ReactNode } from 'react'
import { TlaCloseButton } from '../../components/TlaCloseButton/TlaCloseButton'
import styles from './centered.module.css'

export function TlaCenteredLayout({
	onClose,
	children,
}: {
	onClose?(): void
	children: ReactNode
}) {
	return (
		<div className={classNames(`tla tla-theme__light tl-container`, styles.container)}>
			{onClose ? <TlaCloseButton onClose={onClose} /> : null}
			<div className={styles.inner}>
				<div className={styles.content}>{children}</div>
			</div>
		</div>
	)
}
