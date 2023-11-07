import * as React from 'react'
import { stopEventPropagation } from '../utils/dom'

/** @public */
export type HTMLUiContainerProps = React.HTMLAttributes<HTMLDivElement>

/** @public */
export function HTMLUiContainer({
	children,
	onPointerDown,
	onPointerUp,
	onPointerMove,
	onKeyDown,
	onKeyUp,
	className = '',
	...rest
}: HTMLUiContainerProps) {
	const handlePointerDown = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			stopEventPropagation(e)
			e.currentTarget.setPointerCapture(e.pointerId)
			onPointerDown?.(e)
		},
		[onPointerDown]
	)

	const handlePointerUp = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			stopEventPropagation(e)
			e.currentTarget.releasePointerCapture(e.pointerId)
			onPointerUp?.(e)
		},
		[onPointerUp]
	)

	const handlePointerMove = React.useCallback(
		(e: React.PointerEvent<HTMLDivElement>) => {
			stopEventPropagation(e)
			onPointerMove?.(e)
		},
		[onPointerMove]
	)

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			stopEventPropagation(e)
			onKeyDown?.(e)
		},
		[onKeyDown]
	)

	const handleKeyUp = React.useCallback(
		(e: React.KeyboardEvent<HTMLDivElement>) => {
			stopEventPropagation(e)
			onKeyUp?.(e)
		},
		[onKeyUp]
	)

	return (
		<div
			{...rest}
			onPointerDown={handlePointerDown}
			onPointerUp={handlePointerUp}
			onPointerMove={handlePointerMove}
			onKeyDown={handleKeyDown}
			onKeyUp={handleKeyUp}
			className={`tl-html-container tl-ui-container ${className}`}
		>
			{children}
		</div>
	)
}
