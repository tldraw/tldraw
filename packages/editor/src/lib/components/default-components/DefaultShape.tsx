import { TLShape } from '@tldraw/tlschema'
import { forwardRef, ReactElement } from 'react'

/** @public */
export interface TLShapeProps {
  shape: TLShape
  children: ReactElement
}

/** @public @react */
export const DefaultShape = forwardRef<HTMLDivElement, TLShapeProps>(function DefaultShape({ 
  shape, 
  children
 }, ref) {
	const isFilledShape = 'fill' in shape.props && shape.props.fill !== 'none'

  return (
    <div
    ref={ref}
    className="tl-shape"
    data-shape-type={shape.type}
    data-shape-is-filled={isFilledShape}
    data-shape-id={shape.id}
    draggable={false}>
      {children}
    </div>
  )
})