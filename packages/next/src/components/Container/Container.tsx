import * as React from 'react'
import { autorun } from 'mobx'
import { observer } from 'mobx-react-lite'
import type { TLNuBounds } from '~types'

/* eslint-disable @typescript-eslint/no-non-null-assertion */
interface ContainerProps extends React.HTMLProps<HTMLDivElement> {
  id?: string
  bounds: TLNuBounds
  isGhost?: boolean
  zIndex?: number
  rotation?: number
  counterScaled?: boolean
  className?: string
  children: React.ReactNode
}

export const Container = observer<ContainerProps>(function Container({
  id,
  bounds,
  rotation = 0,
  className = '',
  counterScaled,
  zIndex,
  isGhost,
  children,
  ...props
}) {
  const rBounds = React.useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    return autorun(() => {
      const elm = rBounds.current!

      const transform = `
    translate(
      calc(${bounds.minX}px - var(--nu-padding)),
      calc(${bounds.minY}px - var(--nu-padding))
    )
    rotate(${rotation + (bounds.rotation || 0)}rad)
    ${counterScaled ? 'scale(var(--nu-scale)' : ''}`

      elm.style.setProperty('transform', transform)
    })
  }, [bounds, counterScaled])

  React.useLayoutEffect(() => {
    return autorun(() => {
      const elm = rBounds.current!

      elm.style.setProperty(
        'width',
        `calc(${Math.floor(bounds.width)}px + (var(--nu-padding) * 2))`
      )

      elm.style.setProperty(
        'height',
        `calc(${Math.floor(bounds.height)}px + (var(--nu-padding) * 2))`
      )

      if (zIndex !== undefined) {
        elm.style.setProperty('z-index', zIndex?.toString())
      }
    })
  }, [bounds, rotation])

  return (
    <div
      id={id}
      ref={rBounds}
      className={`nu-positioned ${isGhost ? 'nu-ghost' : ''} ${className}`}
      aria-label="container"
      data-testid="container"
      {...props}
    >
      {children}
    </div>
  )
})
