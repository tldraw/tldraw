/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as React from 'react'
import { observer } from 'mobx-react-lite'
import type { TLNuBounds, TLNuPage, TLNuBinding, TLNuRendererProps, TLNuShape } from '~types'
import { useStylesheet } from '~hooks/useStylesheet'
import { autorun } from 'mobx'
import { useGesture } from '@use-gesture/react'
import { useResizeObserver } from '~hooks/useResizeObserver'
import Vec from '@tldraw/vec'

type NuContext = {
  callbacks: {
    onPan?: (delta: number[]) => void
  }
}

const nuContext = React.createContext<NuContext>({} as NuContext)

function useContext() {
  return React.useContext(nuContext)
}

export const Renderer = observer(function Renderer<
  S extends TLNuShape = TLNuShape,
  B extends TLNuBinding = TLNuBinding
>({ page, onPan }: TLNuRendererProps<S, B>): JSX.Element {
  useStylesheet()

  const [currentContext, setCurrentContext] = React.useState<NuContext>({
    callbacks: {
      onPan,
    },
  })

  React.useEffect(() => {
    autorun(() => {
      setCurrentContext({
        callbacks: {
          onPan,
        },
      })
    })
  }, [])

  return (
    <nuContext.Provider value={currentContext}>
      <div className="nu-container">
        <Canvas page={page} />
      </div>
    </nuContext.Provider>
  )
})

interface CanvasProps<S extends TLNuShape = TLNuShape, B extends TLNuBinding = TLNuBinding> {
  page: TLNuPage<S, B>
}

const Canvas = observer(function Canvas({ page }: CanvasProps) {
  const rContainer = React.useRef<HTMLDivElement>(null)
  const rLayer = React.useRef<HTMLDivElement>(null)
  const { bounds } = useResizeObserver(rContainer)
  const { callbacks } = useContext()

  useCameraCss(rLayer, rContainer, page)

  useGesture(
    {
      onWheel: ({ delta, event: e }) => {
        e.preventDefault()
        if (Vec.isEqual(delta, [0, 0])) return
        callbacks.onPan?.(delta)
      },
    },
    {
      target: rContainer,
      eventOptions: { passive: false },
      pinch: {
        from: page.camera.zoom,
        scaleBounds: () => ({ from: page.camera.zoom, max: 5, min: 0.1 }),
      },
    }
  )

  const shapesArr = Object.values(page.shapes)

  return (
    <div ref={rContainer} className="nu-absolute nu-canvas">
      <div ref={rLayer} className="nu-absolute nu-layer">
        <BoundsBg />
        {shapesArr.map((shape) => (
          <Shape key={shape.id} shape={shape} />
        ))}
        <Indicators />
        <BoundsFg />
        <Cursors />
      </div>
    </div>
  )
})

interface ShapeProps<S extends TLNuShape = TLNuShape> {
  shape: S
}

const Shape = observer(function Shape({ shape }: ShapeProps) {
  const { bounds, Component } = shape

  return (
    <Container bounds={bounds}>
      <Component
        shape={shape}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        meta={null}
      />
    </Container>
  )
})

const Indicators = observer(function Shapes() {
  return <>{/* Indicators... */}</>
})

const BoundsBg = observer(function BoundsBg() {
  return <>{/* Bounds Bg... */}</>
})

const BoundsFg = observer(function BoundsBg() {
  return <>{/* Bounds Fg... */}</>
})

const Cursors = observer(function Cursors() {
  return <>{/* Cursors... */}</>
})

interface ContainerProps extends React.HTMLProps<HTMLDivElement> {
  id?: string
  bounds: TLNuBounds
  isGhost?: boolean
  rotation?: number
  children: React.ReactNode
}

export const Container = observer<ContainerProps>(function Container({
  id,
  bounds,
  rotation = 0,
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
    rotate(${rotation + (bounds.rotation || 0)}rad)`

      elm.style.setProperty('transform', transform)

      elm.style.setProperty(
        'width',
        `calc(${Math.floor(bounds.width)}px + (var(--nu-padding) * 2))`
      )

      elm.style.setProperty(
        'height',
        `calc(${Math.floor(bounds.height)}px + (var(--nu-padding) * 2))`
      )
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

export function useCameraCss(
  layerRef: React.RefObject<HTMLDivElement>,
  containerRef: React.ForwardedRef<HTMLDivElement>,
  page: TLNuPage
) {
  // Update the tl-zoom CSS variable when the zoom changes
  const rZoom = React.useRef<number>()
  const rPoint = React.useRef<number[]>()

  React.useLayoutEffect(() => {
    return autorun(() => {
      const { zoom, point } = page.camera

      const didZoom = zoom !== rZoom.current
      const didPan = point !== rPoint.current

      rZoom.current = zoom
      rPoint.current = point

      if (didZoom || didPan) {
        const layer = layerRef.current
        if (containerRef && 'current' in containerRef) {
          const container = containerRef.current

          // If we zoomed, set the CSS variable for the zoom
          if (didZoom) {
            if (container) {
              container.style.setProperty('--tl-zoom', zoom.toString())
            }
          }

          // Either way, position the layer
          if (layer) {
            layer.style.setProperty(
              'transform',
              `scale(${zoom}) translateX(${point[0]}px) translateY(${point[1]}px)`
            )
          }
        }
      }
    })
  }, [page])
}
