import classNames from 'classnames'
import { ReactElement, ReactNode } from 'react'
import { TlaSpacer } from '../../TlaSpacer/TlaSpacer'
import styles from '../sidebar.module.css'

export function TlaSidebarFileSection({
	title,
	children,
}: {
	title: ReactElement
	children: ReactNode
}) {
	return (
		<>
			<TlaSpacer height="8" />
			<div className={classNames(styles.sectionTitle, 'tla-text_ui__medium')}>{title}</div>
			{children}
		</>
	)
}
