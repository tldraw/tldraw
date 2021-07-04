import { useEffect } from 'react'
import state, { useSelector } from 'state'
import { getShapeUtils } from 'state/shape-utils'
import { PageState, Bounds, ShapeType } from 'types'
import {
  boundsCollide,
  boundsContain,
  debounce,
  deepCompareArrays,
} from 'utils'
import tld from 'utils/tld'

const viewportCache = new WeakMap<PageState, Bounds>()

export default function usePageShapes(): string[] {
  // Reset the viewport cache when the window resizes
  useEffect(() => {
    const handleResize = debounce(() => state.send('RESIZED_WINDOW'), 32)

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  // Get the shapes that fit into the current window
  const visiblePageShapeIds = useSelector((s) => {
    const pageState = tld.getPageState(s.data)

    if (!viewportCache.has(pageState)) {
      const viewport = tld.getViewport(s.data)
      viewportCache.set(pageState, viewport)
    }

    const viewport = viewportCache.get(pageState)

    const shapesToShow = s.values.currentShapes
      .filter((shape) => {
        if (shape.type === ShapeType.Ray || shape.type === ShapeType.Line) {
          return true
        }

        const shapeBounds = getShapeUtils(shape).getBounds(shape)
        return (
          boundsContain(viewport, shapeBounds) ||
          boundsCollide(viewport, shapeBounds)
        )
      })
      .map((shape) => shape.id)

    return shapesToShow
  }, deepCompareArrays)

  return visiblePageShapeIds
}
