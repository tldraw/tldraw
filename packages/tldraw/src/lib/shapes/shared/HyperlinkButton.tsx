import { stopEventPropagation } from '@tldraw/editor'
import classNames from 'classnames'

const LINK_ICON =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='30' height='30' fill='none'%3E%3Cpath stroke='%23000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M13 5H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6M19 5h6m0 0v6m0-6L13 17'/%3E%3C/svg%3E"

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
					mask: `url("${LINK_ICON}") center 100% / 100% no-repeat`,
					WebkitMask: `url("${LINK_ICON}") center 100% / 100% no-repeat`,
				}}
			/>
		</a>
	)
}
