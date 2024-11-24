import classNames from 'classnames'
import { ReactElement } from 'react'
import { TlaSpacer } from '../../TlaSpacer/TlaSpacer'
import styles from '../sidebar.module.css'
import { TlaSidebarFileLink } from './TlaSidebarFileLink'
import { RecentFile } from './sidebar-shared'

export function TlaSidebarFileSection({
	title,
	items,
}: {
	title: ReactElement
	items: RecentFile[]
}) {
	return (
		<div className={styles.section}>
			<TlaSpacer height="8" />
			<div className={classNames(styles.sectionTitle, 'tla-text_ui__medium')}>{title}</div>
			{items.map((item, index) => (
				<TlaSidebarFileLink key={'recent_' + item.fileId} item={item} index={index} />
			))}
		</div>
	)
}
