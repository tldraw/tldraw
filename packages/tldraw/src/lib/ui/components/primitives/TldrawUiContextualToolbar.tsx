import {
	VecLike,
	stopEventPropagation,
	useEditor,
	usePassThroughMouseOverEvents,
	usePassThroughWheelEvents,
	useValue,
} from '@tldraw/editor'
import classNames from 'classnames'
import { RefObject, forwardRef } from 'react'

/** @public */
export interface TLUiContextualToolbarProps {
	children?: React.ReactNode
	className?: string
	position?: VecLike
	isVisible: boolean
	hideIndicator?: boolean
	indicatorOffset?: number
}

/**
 * A generic floating toolbar that can be used for things
 * like rich text editing, image toolbars, etc.
 *
 * @public @react
 */
export const TldrawUiContextualToolbar = forwardRef<HTMLDivElement, TLUiContextualToolbarProps>(
	function TldrawUiContextualToolbar(
		{
			children,
			className,
			position = { x: -1000, y: -1000 },
			isVisible,
			hideIndicator = false,
			indicatorOffset = 0,
		}: TLUiContextualToolbarProps,
		toolbarRef
	) {
		const editor = useEditor()
		const isMobile = useValue('isCoarsePointer', () => editor.getInstanceState().isCoarsePointer, [
			editor,
		])
		usePassThroughWheelEvents((toolbarRef as RefObject<HTMLDivElement>).current)
		usePassThroughMouseOverEvents((toolbarRef as RefObject<HTMLDivElement>).current)

		return (
			<div
				ref={toolbarRef}
				className={classNames('tl-contextual-toolbar', className)}
				data-is-mobile={isMobile}
				data-is-visible={isVisible}
				style={{
					left: `${position.x}px`,
					top: `${position.y}px`,
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
	}
)
