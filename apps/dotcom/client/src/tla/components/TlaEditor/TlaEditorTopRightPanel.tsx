import { forwardRef, useRef } from 'react'
import { PeopleMenu, usePassThroughWheelEvents, useTranslation } from 'tldraw'
import { ShareButtonProps } from '../../../components/ShareButton'
import { useCurrentFileId } from '../../hooks/useCurrentFileId'
import { TlaFileShareMenu } from '../TlaFileShareMenu/TlaFileShareMenu'
import styles from './top.module.css'

export function TlaEditorTopRightPanel() {
	const ref = useRef<HTMLDivElement>(null)
	usePassThroughWheelEvents(ref)
	const fileId = useCurrentFileId()

	return (
		<div ref={ref} className={styles.topRightPanel}>
			<PeopleMenu />
			<TlaFileShareMenu fileId={fileId} source="file-header">
				<ShareButton title={'share-menu.title'} label={'share-menu.title'} />
			</TlaFileShareMenu>
		</div>
	)
}

// todo, move styles from z-board.css to top.module.css

export const ShareButton = forwardRef<HTMLButtonElement, ShareButtonProps>(function ShareButton(
	{ label, title, ...props },
	ref
) {
	const msg = useTranslation()
	const titleStr = msg(title)
	const labelStr = msg(label)
	return (
		<button
			ref={ref}
			draggable={false}
			type="button"
			title={titleStr}
			className="tlui-share-zone__button-wrapper"
			{...props}
		>
			<div className="tlui-button tlui-button__normal tlui-share-zone__button">
				<span className="tlui-button__label" draggable={false}>
					{labelStr}
				</span>
			</div>
		</button>
	)
})
