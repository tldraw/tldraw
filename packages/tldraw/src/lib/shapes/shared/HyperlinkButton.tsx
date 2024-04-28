import { stopEventPropagation } from '@tldraw/editor'
import classNames from 'classnames'
import { tldrawConstants } from '../../tldraw-constants'
const { HYPERLINK_ICON } = tldrawConstants

export function HyperlinkButton({ url, zoomLevel }: { url: string; zoomLevel: number }) {
	return (
		<a
			className={classNames('tl-hyperlink-button', {
				'tl-hyperlink-button__hidden': zoomLevel < 0.32,
			})}
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			onPointerDown={stopEventPropagation}
			onPointerUp={stopEventPropagation}
			title={url}
			draggable={false}
		>
			<div
				className="tl-hyperlink-button__icon"
				style={{
					mask: `url("${HYPERLINK_ICON}") center 100% / 100% no-repeat`,
					WebkitMask: `url("${HYPERLINK_ICON}") center 100% / 100% no-repeat`,
				}}
			/>
		</a>
	)
}
