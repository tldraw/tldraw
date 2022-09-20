import * as React from 'react'
import type { HTMLProps } from 'react'
import { usePosition } from '~hooks'
import type { TLBounds } from '~types'

export interface ContainerProps extends HTMLProps<HTMLDivElement> {
  id?: string
  bounds: TLBounds
  rotation?: number
  isGhost?: boolean
  isSelected?: boolean
  children: React.ReactNode
}

function _Container({
  id,
  bounds,
  rotation = 0,
  isGhost = false,
  isSelected = false,
  children,
  ...props
}: ContainerProps) {
  const rPositioned = usePosition(bounds, rotation)

  return (
    <div
      id={id}
      ref={rPositioned}
      className={`tl-positioned${isGhost ? ' tl-ghost' : ''}${
        isSelected ? ` tl-positioned-selected` : ''
      }`}
      aria-label="container"
      data-testid="container"
      {...props}
    >
      {children}
    </div>
  )
}

export const Container = React.memo(_Container)
