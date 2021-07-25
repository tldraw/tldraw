import * as React from 'react'
import { TLBounds } from '../../types'

class BrushUpdater {
  ref = React.createRef<SVGRectElement>()

  set(bounds?: TLBounds) {
    if (!bounds) {
      this.clear()
      return
    }

    const elm = this.ref?.current
    if (!elm) return
    elm.setAttribute('opacity', '1')
    elm.setAttribute('x', bounds.minX.toString())
    elm.setAttribute('y', bounds.minY.toString())
    elm.setAttribute('width', bounds.width.toString())
    elm.setAttribute('height', bounds.height.toString())
  }

  clear() {
    const elm = this.ref?.current
    if (!elm) return
    elm.setAttribute('opacity', '0')
    elm.setAttribute('width', '0')
    elm.setAttribute('height', '0')
  }
}

export const brushUpdater = new BrushUpdater()

interface BrushProps {
  brush?: TLBounds
}

export function Brush({ brush }: BrushProps): JSX.Element | null {
  return (
    <rect
      ref={brushUpdater.ref}
      className="tl-brush"
      x={brush?.minX || 0}
      y={brush?.minY || 0}
      width={brush?.width || 0}
      height={brush?.height || 0}
    />
  )
}
