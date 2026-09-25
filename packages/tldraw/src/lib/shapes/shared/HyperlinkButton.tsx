import { useEditor } from '@tldraw/editor'
import classNames from 'classnames'
import { PointerEventHandler, useCallback } from 'react'
import { LINK_ICON } from './icons-editor'
import { useEfficientZoomThreshold } from './useEfficientZoomThreshold'

export function HyperlinkButton({ url }: { url: string }) {
	const editor = useEditor()
	const hideButton = useEfficientZoomThreshold()
	const markAsHandledOnShiftKey = useCallback<PointerEventHandler>(
		(e) => {
			if (!editor.inputs.getShiftKey()) editor.markEventAsHandled(e)
		},
		[editor]
	)
	return (
		<a
			className={classNames('tl-hyperlink-button', {
				'tl-hyperlink-button__hidden': hideButton,
			})}
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			onPointerDown={markAsHandledOnShiftKey}
			onPointerUp={markAsHandledOnShiftKey}
			title={url}
			draggable={false}
		>
			<div
				className="tl-hyperlink__icon"
				style={{
					mask: `url("${LINK_ICON}") center 100% / 100% no-repeat`,
					WebkitMask: `url("${LINK_ICON}") center 100% / 100% no-repeat`,
				}}
			/>
		</a>
	)
}
