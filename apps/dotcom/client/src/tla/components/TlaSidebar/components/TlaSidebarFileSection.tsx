import classNames from 'classnames'
import { ReactElement, ReactNode } from 'react'
import { TlaIcon } from '../../TlaIcon/TlaIcon'
import { TlaSpacer } from '../../TlaSpacer/TlaSpacer'
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
	return (
		<div className={styles.section}>
			<TlaSpacer height="8" />
			<div className={classNames('tla-text_ui__medium', styles.sectionTitle)}>
				{iconLeft ? <TlaIcon icon={iconLeft} /> : null}
				<span>{title}</span>
			</div>
			{children}
		</div>
	)
}
