import { TLBoundsCorner, TLSnapLine, TLBoundsEdge, Utils, TLBoundsWithCenter } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import { SessionType, TLDrawShape, TLDrawStatus } from '~types'
import type { Session } from '~types'
import type { Data } from '~types'
import { TLDR } from '~state/tldr'
import { SNAP_DISTANCE } from '~state/constants'

type SnapInfo =
  | {
      state: 'empty'
    }
  | {
      state: 'ready'
      bounds: TLBoundsWithCenter[]
    }

export class TransformSingleSession implements Session {
  type = SessionType.TransformSingle
  status = TLDrawStatus.Transforming
  transformType: TLBoundsEdge | TLBoundsCorner
  origin: number[]
  scaleX = 1
  scaleY = 1
  isCreate: boolean
  snapshot: TransformSingleSnapshot
  snapInfo: SnapInfo = { state: 'empty' }
  prevPoint = [0, 0]
  speed = 1

  constructor(
    data: Data,
    point: number[],
    transformType: TLBoundsEdge | TLBoundsCorner = TLBoundsCorner.BottomRight,
    isCreate = false
  ) {
    this.origin = point
    this.transformType = transformType
    this.snapshot = getTransformSingleSnapshot(data, transformType)
    this.isCreate = isCreate
  }

  start = (data: Data) => {
    this.createSnapInfo(data)
    return void null
  }

  update = (data: Data, point: number[], shiftKey = false, altKey = false, metaKey = false) => {
    const { transformType } = this

    const { currentPageId, initialShapeBounds, initialShape, id } = this.snapshot

    const delta = Vec.sub(point, this.origin)

    const shapes = {} as Record<string, Partial<TLDrawShape>>

    const shape = TLDR.getShape(data, id, data.appState.currentPageId)

    const utils = TLDR.getShapeUtils(shape)

    let newBounds = Utils.getTransformedBoundingBox(
      initialShapeBounds,
      transformType,
      delta,
      shape.rotation,
      shiftKey || shape.isAspectRatioLocked || utils.isAspectRatioLocked
    )

    // Should we snap?

    // Speed is used to decide which snap points to use. At a high
    // speed, we don't use any snap points. At a low speed, we only
    // allow center-to-center snap points. At very low speed, we
    // enable all snap points (still preferring middle snaps). We're
    // using an acceleration function here to smooth the changes in
    // speed, but we also want the speed to accelerate faster than
    // it decelerates.

    const speed = Vec.dist(point, this.prevPoint)

    this.prevPoint = point

    const speedChange = speed - this.speed

    this.speed = this.speed + speedChange * (speedChange > 1 ? 0.5 : 0.15)

    let snapLines: TLSnapLine[] = []

    const { zoom } = data.document.pageStates[currentPageId].camera

    if (
      !metaKey &&
      !initialShape.rotation && // not now anyway
      this.speed * zoom < 5 &&
      this.snapInfo.state === 'ready'
    ) {
      const bounds = Utils.getBoundsWithCenter(newBounds)

      const snapResult = Utils.getSnapPoints(
        bounds,
        this.snapInfo.bounds,
        SNAP_DISTANCE / zoom,
        this.speed * zoom < 0.45
      )

      if (snapResult) {
        snapLines = snapResult.snapLines

        newBounds = Utils.getTransformedBoundingBox(
          initialShapeBounds,
          transformType,
          Vec.sub(delta, snapResult.offset),
          shape.rotation,
          shiftKey || shape.isAspectRatioLocked || utils.isAspectRatioLocked
        )
      }
    }

    const afterShape = TLDR.getShapeUtils(shape).transformSingle(shape, newBounds, {
      initialShape,
      type: this.transformType,
      scaleX: newBounds.scaleX,
      scaleY: newBounds.scaleY,
      transformOrigin: [0.5, 0.5],
    })

    if (afterShape) {
      shapes[shape.id] = afterShape
    }

    return {
      appState: {
        snapLines,
      },
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes,
          },
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShape } = this.snapshot

    const shapes = {} as Record<string, TLDrawShape | undefined>

    if (this.isCreate) {
      shapes[initialShape.id] = undefined
    } else {
      shapes[initialShape.id] = initialShape
    }

    return {
      appState: {
        snapLines: [],
      },
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: {
            selectedIds: this.isCreate ? [] : [initialShape.id],
          },
        },
      },
    }
  }

  complete(data: Data) {
    if (!this.snapshot.hasUnlockedShape) return data

    const { initialShape } = this.snapshot

    const beforeShapes = {} as Record<string, Partial<TLDrawShape> | undefined>
    const afterShapes = {} as Record<string, Partial<TLDrawShape>>

    beforeShapes[initialShape.id] = this.isCreate ? undefined : initialShape

    afterShapes[initialShape.id] = TLDR.onSessionComplete(
      TLDR.getShape(data, initialShape.id, data.appState.currentPageId)
    )

    return {
      id: 'transform_single',
      before: {
        appState: {
          snapLines: [],
        },
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: beforeShapes,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              selectedIds: this.isCreate ? [] : [initialShape.id],
              editingId: undefined,
              hoveredId: undefined,
            },
          },
        },
      },
      after: {
        appState: {
          snapLines: [],
        },
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: afterShapes,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              selectedIds: [initialShape.id],
              editingId: undefined,
              hoveredId: undefined,
            },
          },
        },
      },
    }
  }

  private createSnapInfo = async (data: Data) => {
    const { initialShape } = this.snapshot
    const { currentPageId } = data.appState
    const page = data.document.pages[currentPageId]

    this.snapInfo = {
      state: 'ready',
      bounds: Object.values(page.shapes)
        .filter((shape) => shape.id !== initialShape.id)
        .map((shape) => Utils.getBoundsWithCenter(TLDR.getRotatedBounds(shape))),
    }
  }
}

export function getTransformSingleSnapshot(
  data: Data,
  transformType: TLBoundsEdge | TLBoundsCorner
) {
  const { currentPageId } = data.appState
  const shape = TLDR.getShape(data, TLDR.getSelectedIds(data, currentPageId)[0], currentPageId)

  if (!shape) {
    throw Error('You must have one shape selected.')
  }

  return {
    id: shape.id,
    currentPageId,
    hasUnlockedShape: !shape.isLocked,
    type: transformType,
    initialShape: Utils.deepClone(shape),
    initialShapeBounds: TLDR.getBounds(shape),
    commonBounds: TLDR.getRotatedBounds(shape),
  }
}

export type TransformSingleSnapshot = ReturnType<typeof getTransformSingleSnapshot>
