import { TLShapeProps } from '@tldraw/editor'
import { forwardRef } from 'react'
import { useA11yForShapes } from '../ui/components/A11y'

/** @public @react */
export const TldrawShape = forwardRef<HTMLDivElement, TLShapeProps>(function TldrawShape({ 
  shape, 
  children
 }, ref) {
	const isFilledShape = 'fill' in shape.props && shape.props.fill !== 'none'
	const a11yShapeProps = useA11yForShapes(shape)

  return (
    <div
    ref={ref}
    className="tl-shape"
    data-shape-type={shape.type}
    data-shape-is-filled={isFilledShape}
    data-shape-id={shape.id}
    draggable={false}
		{...a11yShapeProps}
		>
      {children}
    </div>
  )
})