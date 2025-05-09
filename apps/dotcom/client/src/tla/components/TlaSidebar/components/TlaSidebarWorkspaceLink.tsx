import classNames from 'classnames'
import { TlaIcon, TlaIconWrapper } from '../../TlaIcon/TlaIcon'
import styles from '../sidebar.module.css'

export function TlaSidebarWorkspaceLink() {
	const brandName = 'tldraw'

	return (
		<div className={styles.sidebarWorkspaceButton} data-testid="tla-sidebar-logo-icon">
			<TlaIconWrapper data-size="m">
				<TlaIcon className="tla-tldraw-sidebar-icon" icon="tldraw" ariaLabel="tldraw" />
			</TlaIconWrapper>
			<span
				className={classNames(
					styles.sidebarWorkspaceButtonLabel,
					'tla-text_ui__title',
					'notranslate'
				)}
			>
				{brandName}
			</span>
			{/* <button className={styles.linkButton} title={homeLbl} /> */}
		</div>
	)
}
