import { forwardRef, useRef } from 'react'
import { PeopleMenu, usePassThroughWheelEvents } from 'tldraw'
import { F } from '../../app/i18n'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { useTldrawAppUiEvents } from '../../utils/app-ui-events'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import styles from './top.module.css'

export function TlaEditorTopRightPanel() {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref.current)
	const fileId = useCurrentFileId()

	return (
		<div ref={ref} className={styles.topRightPanel}>
			<PeopleMenu />
			<TlaFileShareMenu fileId={fileId!} source="file-header">
				<ShareButton />
			</TlaFileShareMenu>
		</div>
	)
}

// todo, move styles from globals.css to top.module.css

export const ShareButton = forwardRef<HTMLButtonElement>(function ShareButton(props, ref) {
	const trackEvent = useTldrawAppUiEvents()
	return (
		<button
			ref={ref}
			draggable={false}
			type="button"
			className="tlui-share-zone__button-wrapper"
			{...props}
			onClick={() => trackEvent('open-share-menu', { source: 'file-header' })}
		>
			<div className="tlui-button tlui-button__normal tlui-share-zone__button">
				<span className="tlui-button__label" draggable={false}>
					<F defaultMessage="Share" />
				</span>
			</div>
		</button>
	)
})
