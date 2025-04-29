import {
	stopEventPropagation,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
} from '@tldraw/editor'
import classNames from 'classnames'
import React, { RefObject } from 'react'
import { TldrawUiToolbar } from './TldrawUiToolbar'

/** @public */
export interface TLUiContextualToolbarProps {
	children?: React.ReactNode
	className?: string
	label: string
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
>(function TldrawUiContextualToolbar({ children, className, label }, toolbarRef) {
	usePassThroughWheelEvents(toolbarRef as RefObject<HTMLDivElement>)
	usePassThroughMouseOverEvents(toolbarRef as RefObject<HTMLDivElement>)

	return (
		<div
			ref={toolbarRef}
			data-testid="contextual-toolbar"
			className={classNames('tlui-contextual-toolbar', className)}
			onPointerDown={stopEventPropagation}
		>
			<TldrawUiToolbar className="tlui-menu tlui-buttons__horizontal" label={label}>
				{children}
			</TldrawUiToolbar>
		</div>
	)
})
