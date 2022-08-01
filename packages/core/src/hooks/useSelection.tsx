import * as React from 'react'
import type { TLShapeUtil, TLShapeUtilsMap } from '~TLShapeUtil'
import type { TLBinding, TLBounds, TLPage, TLPageState, TLShape } from '~types'
import Utils from '~utils'
import { useTLContext } from './useTLContext'

function canvasToScreen(point: number[], camera: TLPageState['camera']): number[] {
  return [(point[0] + camera.point[0]) * camera.zoom, (point[1] + camera.point[1]) * camera.zoom]
}

function getShapeUtils<T extends TLShape>(shapeUtils: TLShapeUtilsMap<T>, shape: T) {
  return shapeUtils[shape.type as T['type']] as unknown as TLShapeUtil<T>
}

export function useSelection<T extends TLShape>(
  page: TLPage<T, TLBinding>,
  pageState: TLPageState,
  shapeUtils: TLShapeUtilsMap<T>
) {
  const { rSelectionBounds } = useTLContext()
  const { selectedIds } = pageState
  const rPrevBounds = React.useRef<TLBounds>()

  let bounds: TLBounds | undefined = undefined
  let rotation = 0
  let isLocked = false
  let isLinked = false

  if (selectedIds.length === 1) {
    const id = selectedIds[0]
    const shape = page.shapes[id]

    if (!shape) {
      throw Error(`selectedIds is set to the id of a shape that doesn't exist: ${id}`)
    }

    rotation = shape.rotation || 0
    isLocked = shape.isLocked || false

    const utils = getShapeUtils(shapeUtils, shape)

    bounds = utils.hideBounds ? undefined : utils.getBounds(shape)
  } else if (selectedIds.length > 1) {
    const selectedShapes = selectedIds.map((id) => page.shapes[id])

    rotation = 0

    isLocked = selectedShapes.every((shape) => shape.isLocked)

    bounds = selectedShapes.reduce((acc, shape, i) => {
      if (i === 0) {
        return getShapeUtils(shapeUtils, shape).getRotatedBounds(shape)
      }
      return Utils.getExpandedBounds(acc, getShapeUtils(shapeUtils, shape).getRotatedBounds(shape))
    }, {} as TLBounds)
  }

  if (bounds) {
    const [minX, minY] = canvasToScreen([bounds.minX, bounds.minY], pageState.camera)
    const [maxX, maxY] = canvasToScreen([bounds.maxX, bounds.maxY], pageState.camera)

    isLinked = !!Object.values(page.bindings).find(
      (binding) => selectedIds.includes(binding.toId) || selectedIds.includes(binding.fromId)
    )

    rSelectionBounds.current = {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    }
  } else {
    rSelectionBounds.current = null
  }

  const prevBounds = rPrevBounds.current

  if (!prevBounds || !bounds) {
    rPrevBounds.current = bounds
  } else if (bounds) {
    if (
      prevBounds.minX === bounds.minX &&
      prevBounds.minY === bounds.minY &&
      prevBounds.maxX === bounds.maxX &&
      prevBounds.maxY === bounds.maxY
    ) {
      bounds = rPrevBounds.current
    }
  }

  return { bounds, rotation, isLocked, isLinked }
}
