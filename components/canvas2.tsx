import useCanvasEvents from 'hooks/useCanvasEvents'
import useZoomEvents from 'hooks/useZoomEvents'
import { getShapeStyle } from 'lib/shape-styles'
import { getShapeUtils } from 'lib/shape-utils'
import { useCallback, useEffect, useRef } from 'react'
import state, { useSelector } from 'state'
import inputs from 'state/inputs'
import styled from 'styles'
import { Shape } from 'types'
import { boundsCollide, boundsContain } from 'utils/bounds'
import {
  getBoundsFromPoints,
  getPage,
  getPageState,
  getShapes,
  screenToWorld,
  worldToScreen,
} from 'utils/utils'

const shapeCache = new Map<Shape, HTMLCanvasElement>()
const selectedShapeCache = new Map<Shape, HTMLCanvasElement>()

export default function Canvas2() {
  const rWrapper = useRef<HTMLDivElement>(null)
  const rMainCanvas = useRef<HTMLCanvasElement>(null)
  const rOverlayCanvas = useRef<HTMLCanvasElement>(null)

  useZoomEvents()

  const events = useCanvasEvents(rWrapper)

  const isReady = useSelector((s) => s.isIn('ready'))
  const isSelecting = useSelector((s) => s.isIn('selecting'))

  useEffect(() => {
    const cvs = rMainCanvas.current
    const overlay_cvs = rOverlayCanvas.current

    const dpr = window.devicePixelRatio

    cvs.setAttribute('width', window.innerWidth * dpr + 'px')
    cvs.setAttribute('height', window.innerHeight * dpr + 'px')
    cvs.style.setProperty('transform-origin', `top left`)
    cvs.style.setProperty('transform', `scale(${1 / dpr})`)

    overlay_cvs.setAttribute('width', window.innerWidth * dpr + 'px')
    overlay_cvs.setAttribute('height', window.innerHeight * dpr + 'px')
    overlay_cvs.style.setProperty('transform-origin', `top left`)
    overlay_cvs.style.setProperty('transform', `scale(${1 / dpr})`)
  }, [window.innerWidth, window.innerHeight])

  useEffect(() => {
    const dpr = window.devicePixelRatio

    let prevZoom = 1

    return state.onUpdate((s) => {
      const wrapper = rWrapper.current
      const cvs = rMainCanvas.current
      const overlay_cvs = rOverlayCanvas.current

      if (!(wrapper && cvs && overlay_cvs)) return

      const pageState = getPageState(s.data)
      let { camera, selectedIds } = pageState

      if (!('has' in selectedIds)) {
        selectedIds = new Set(selectedIds)
      }

      const viewport = getBoundsFromPoints([
        screenToWorld([0, 0], s.data),
        screenToWorld(
          [window.innerWidth * dpr, window.innerHeight * dpr],
          s.data
        ),
      ])

      const ctx = cvs.getContext('2d')
      ctx.clearRect(0, 0, cvs.width, cvs.height)

      const overlay_ctx = overlay_cvs.getContext('2d')
      overlay_ctx.clearRect(0, 0, cvs.width, cvs.height)

      // If zoom has changed, clear the cache.
      // This should be done when exiting a "zooming" state.
      if (camera.zoom !== prevZoom) {
        prevZoom = camera.zoom
        shapeCache.clear()
        selectedShapeCache.clear()
      }

      for (let shape of getShapes(s.data)) {
        const bounds = getShapeUtils(shape).getBounds(shape)

        // Skip shapes that lie outside of the current viewport
        if (
          !(boundsContain(viewport, bounds) || boundsCollide(viewport, bounds))
        ) {
          continue
        }

        const { minX, minY, width, height } = bounds

        const x = (minX + camera.point[0]) * camera.zoom
        const y = (minY + camera.point[1]) * camera.zoom
        const w = width * camera.zoom
        const h = height * camera.zoom
        const p = 32 * camera.zoom

        if (!shapeCache.has(shape)) {
          const tvs = document.createElement('canvas')
          tvs.setAttribute('width', w + p + 'px')
          tvs.setAttribute('height', h + p + 'px')

          const ttx = tvs.getContext('2d')

          ttx.translate(p / 2, p / 2)
          ttx.scale(camera.zoom, camera.zoom)

          const style = getShapeStyle(shape.style)

          ttx.fillStyle = style.fill
          ttx.strokeStyle = style.stroke
          ttx.lineWidth = +style.strokeWidth
          ttx.lineCap = 'round'
          ttx.lineJoin = 'round'

          const path = getShapeUtils(shape).getPath2D(shape)

          ttx.fill(path)
          ttx.stroke(path)

          shapeCache.set(shape, tvs)
        }

        ctx.save()
        ctx.drawImage(shapeCache.get(shape), x - p / 2, y - p / 2)
        ctx.restore()

        // Render selection onto overlay canvas
        if (selectedIds.has(shape.id)) {
          if (!selectedShapeCache.has(shape)) {
            const tvs = document.createElement('canvas')
            tvs.setAttribute('width', w + p + 'px')
            tvs.setAttribute('height', h + p + 'px')

            const ttx = tvs.getContext('2d')

            ttx.translate(p / 2, p / 2)
            ttx.scale(camera.zoom, camera.zoom)

            const style = getShapeStyle(shape.style)

            ttx.fillStyle = 'cornflowerblue'
            ttx.strokeStyle = 'cornflowerblue'
            ttx.lineWidth = +style.strokeWidth + 5 / camera.zoom
            ttx.lineCap = 'round'
            ttx.lineJoin = 'round'

            const path = getShapeUtils(shape).getPath2D(shape)

            ttx.fill(path)
            ttx.stroke(path)

            ttx.lineWidth = +style.strokeWidth
            ttx.globalCompositeOperation = 'destination-out'

            ttx.fill(path)
            ttx.stroke(path)

            selectedShapeCache.set(shape, tvs)
          }

          overlay_ctx.drawImage(
            selectedShapeCache.get(shape),
            x - p / 2,
            y - p / 2
          )
        }
      }

      // Render Brush
    })
  }, [])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!inputs.canAccept(e.pointerId)) return

    rWrapper.current.setPointerCapture(e.pointerId)

    if (e.button === 0) {
      state.send('POINTED_CANVAS', inputs.pointerDown(e, 'canvas'))
    } else if (e.button === 2) {
      state.send('RIGHT_POINTED', inputs.pointerDown(e, 'canvas'))
    }
  }, [])

  return (
    <CanvasWrapper ref={rWrapper} {...events} onPointerDown={handlePointerDown}>
      <StyledCanvas id="main-canvas" ref={rMainCanvas} isHidden={!isReady} />
      <StyledCanvas
        id="overlay-canvas"
        ref={rOverlayCanvas}
        isHidden={!(isReady && isSelecting)}
      />
    </CanvasWrapper>
  )
}

const CanvasWrapper = styled('div', {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  touchAction: 'none',
  zIndex: 101,
  pointerEvents: 'all',
})

const StyledCanvas = styled('canvas', {
  position: 'absolute',
  top: 0,
  left: 0,
  pointerEvents: 'none',
  backgroundColor: 'transparent',
  userSelect: 'none',
  transformOrigin: 'top left',

  variants: {
    isHidden: {
      true: {
        opacity: 0,
      },
    },
  },
})
