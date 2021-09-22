import * as React from 'react'
import type { TLBounds } from '+types'
import { usePosition } from '+hooks'

interface ContainerProps {
  id?: string
  bounds: TLBounds
  rotation?: number
  className?: string
  children: React.ReactNode
}

export const Container = React.memo(
  ({ id, bounds, rotation = 0, className, children }: ContainerProps) => {
    const rPositioned = usePosition(bounds, rotation)

    return (
      <div id={id} ref={rPositioned} className={['tl-positioned', className || ''].join(' ')}>
        {children}
      </div>
    )
  }
)
