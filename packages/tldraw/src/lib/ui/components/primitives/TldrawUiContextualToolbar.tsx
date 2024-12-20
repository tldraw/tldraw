import {
	VecLike,
	stopEventPropagation,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
} from '@tldraw/editor'
import classNames from 'classnames'
import React, { RefObject } from 'react'

/** @public */
export interface TLUiContextualToolbarProps {
	children?: React.ReactNode
	className?: string
	position?: VecLike
	hideIndicator?: boolean
	indicatorOffset?: number
}

/**
 * A generic floating toolbar that can be used for things
 * like rich text editing, image toolbars, etc.
 *
 * @public @react
 */
export const TldrawUiContextualToolbar = React.forwardRef<
	HTMLDivElement,
	TLUiContextualToolbarProps
>(function TldrawUiContextualToolbar(
	{
		children,
		className,
		position = { x: -1000, y: -1000 },
		hideIndicator = false,
		indicatorOffset = 0,
	},
	toolbarRef
) {
	usePassThroughWheelEvents(toolbarRef as RefObject<HTMLDivElement>)
	usePassThroughMouseOverEvents(toolbarRef as RefObject<HTMLDivElement>)

	return (
		<div
			ref={toolbarRef}
			className={classNames('tl-contextual-toolbar', className)}
			style={{
				transform: `translate(${position.x}px, ${position.y}px)`,
			}}
			onPointerDown={stopEventPropagation}
		>
			{!hideIndicator && (
				<div
					className="tl-contextual-toolbar__indicator"
					style={{ left: `calc(50% - var(--arrow-size) - ${indicatorOffset}px)` }}
				/>
			)}
			<div className="tlui-toolbar__tools" role="radiogroup">
				{children}
			</div>
		</div>
	)
})
