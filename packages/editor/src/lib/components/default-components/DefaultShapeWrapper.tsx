import { TLShape } from '@tldraw/tlschema'
import classNames from 'classnames'
import { forwardRef, ReactNode } from 'react'

/** @public */
export interface TLShapeWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
	/** The shape being rendered. */
	shape: TLShape
	/** Whether this is the shapes regular, or background component. */
	isBackground: boolean
	/** The shape's rendered component. */
	children: ReactNode
}

/** @public @react */
export const DefaultShapeWrapper = forwardRef(function DefaultShapeWrapper(
	{ children, shape, isBackground, ...props }: TLShapeWrapperProps,
	ref: React.Ref<HTMLDivElement>
) {
	const isFilledShape = 'fill' in shape.props && shape.props.fill !== 'none'

	return (
		<div
			ref={ref}
			data-shape-type={shape.type}
			data-shape-is-filled={isBackground ? undefined : isFilledShape}
			data-shape-id={shape.id}
			draggable={false}
			{...props}
			className={classNames('tl-shape', isBackground && 'tl-shape-background', props.className)}
		>
			{children}
		</div>
	)
})
