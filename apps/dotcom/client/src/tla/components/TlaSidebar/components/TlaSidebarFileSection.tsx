import classNames from 'classnames'
import { ReactElement, ReactNode } from 'react'
import { useUniqueSafeId } from 'tldraw'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

export function TlaSidebarFileSection({
	title,
	iconLeft,
	children,
}: {
	title: ReactElement
	iconLeft?: string
	children: ReactNode
}) {
	const id = useUniqueSafeId()
	return (
		<div className={styles.sidebarFileSection} role="list" aria-labelledby={id}>
			<div className={classNames('tla-text_ui__medium', styles.sidebarFileSectionTitle)}>
				{iconLeft ? <TlaIcon icon={iconLeft} /> : null}
				<span id={id} role="heading">
					{title}
				</span>
			</div>
			{children}
		</div>
	)
}
