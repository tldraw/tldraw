import type {
  TLPage,
  TLPageState,
  TLShape,
  TLBounds,
  TLShapeUtils,
} from '../../types'
import Utils from '../../utils'
import { useTLContext } from '../hooks/useTLContext'

function canvasToScreen(
  point: number[],
  camera: TLPageState['camera']
): number[] {
  return [
    (point[0] + camera.point[0]) * camera.zoom,
    (point[1] + camera.point[1]) * camera.zoom,
  ]
}

export function useSelection<T extends TLShape>(
  page: TLPage<T>,
  pageState: TLPageState,
  shapeUtils: TLShapeUtils<T>
) {
  const { rScreenBounds } = useTLContext()
  const { selectedIds } = pageState

  let bounds: TLBounds | undefined = undefined
  let rotation = 0
  let isLocked = false

  if (selectedIds.length === 1) {
    const id = selectedIds[0]

    const shape = page.shapes[id]

    rotation = shape.rotation || 0

    isLocked = shape.isLocked || false

    bounds = shapeUtils[shape.type as T['type']].getBounds(shape)
  } else if (selectedIds.length > 1) {
    const selectedShapes = selectedIds.map((id) => page.shapes[id])

    rotation = 0

    isLocked = selectedShapes.every((shape) => shape.isLocked)

    bounds = selectedShapes.reduce((acc, shape, i) => {
      if (i === 0) {
        return shapeUtils[shape.type as T['type']].getRotatedBounds(shape)
      }
      return Utils.getExpandedBounds(
        acc,
        shapeUtils[shape.type as T['type']].getRotatedBounds(shape)
      )
    }, {} as TLBounds)
  }

  if (bounds) {
    const [minX, minY] = canvasToScreen(
      [bounds.minX, bounds.minY],
      pageState.camera
    )
    const [maxX, maxY] = canvasToScreen(
      [bounds.maxX, bounds.maxY],
      pageState.camera
    )

    rScreenBounds.current = {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    }
  } else {
    rScreenBounds.current = null
  }

  return { bounds, rotation, isLocked }
}
