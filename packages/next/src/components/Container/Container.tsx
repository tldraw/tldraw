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
  children: React.ReactNode
}

export const Container = observer<ContainerProps>(function Container({
  id,
  bounds,
  rotation = 0,
  zIndex,
  isGhost,
  children,
  ...props
}) {
  const rBounds = React.useRef<HTMLDivElement>(null)
  const rTransform = React.useRef<SVGSVGElement>(null)

  React.useLayoutEffect(() => {
    return autorun(() => {
      const elm = rBounds.current!

      const transform = `
    translate(
      calc(${bounds.minX}px - var(--nu-padding)),
      calc(${bounds.minY}px - var(--nu-padding))
    )
    rotate(${rotation + (bounds.rotation || 0)}rad)`

      elm.style.setProperty('transform', transform)

      // if (zIndex !== undefined) {
      //   elm.style.setProperty('z-index', zIndex?.toString())
      // }
    })
  }, [bounds])

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
      className={isGhost ? 'nu-positioned nu-ghost' : 'nu-positioned'}
      aria-label="container"
      data-testid="container"
      {...props}
    >
      {children}
    </div>
  )
})
