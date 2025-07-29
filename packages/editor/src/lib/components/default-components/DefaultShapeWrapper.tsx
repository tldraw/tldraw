import { TLShape } from '@tldraw/tlschema'
import { forwardRef, ReactNode } from 'react'

/** @public */
export interface TLShapeWrapperProps {
	/** The shape being rendered. */
	shape: TLShape
	/** Whether this is the shapes regular, or background component. */
	isBackground: boolean
	/** The shape's rendered component. */
	children: ReactNode
}

/** @public @react */
export const DefaultShapeWrapper = forwardRef(function DefaultShapeWrapper(
	{ children, shape, isBackground }: TLShapeWrapperProps,
	ref: React.Ref<HTMLDivElement>
) {
	const isFilledShape = 'fill' in shape.props && shape.props.fill !== 'none'

	return (
		<div
			ref={ref}
			className={isBackground ? 'tl-shape tl-shape-background' : 'tl-shape'}
			data-shape-type={shape.type}
			data-shape-is-filled={isBackground ? undefined : isFilledShape}
			data-shape-id={shape.id}
			draggable={false}
		>
			{children}
		</div>
	)
})
