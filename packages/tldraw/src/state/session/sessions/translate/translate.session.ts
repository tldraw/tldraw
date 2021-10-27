/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TLPageState, Utils, TLBoundsWithCenter, TLSnapLine, TLBounds } from '@tldraw/core'
import { Vec } from '@tldraw/vec'
import {
  TLDrawShape,
  TLDrawBinding,
  Session,
  Data,
  TLDrawCommand,
  TLDrawStatus,
  ArrowShape,
  GroupShape,
  SessionType,
  ArrowBinding,
  TLDrawShapeType,
} from '~types'
import { SLOW_SPEED, SNAP_DISTANCE } from '~constants'
import { TLDR } from '~state/tldr'
import type { Patch } from 'rko'

type CloneInfo =
  | {
      state: 'empty'
    }
  | {
      state: 'ready'
      clones: TLDrawShape[]
      clonedBindings: ArrowBinding[]
    }

type SnapInfo =
  | {
      state: 'empty'
    }
  | {
      state: 'ready'
      others: TLBoundsWithCenter[]
      bounds: TLBoundsWithCenter[]
    }

export class TranslateSession extends Session {
  type = SessionType.Translate
  status = TLDrawStatus.Translating
  delta = [0, 0]
  prev = [0, 0]
  prevPoint = [0, 0]
  speed = 1
  origin: number[]
  snapshot: TranslateSnapshot
  cloneInfo: CloneInfo = {
    state: 'empty',
  }
  snapInfo: SnapInfo = {
    state: 'empty',
  }
  snapLines: TLSnapLine[] = []
  isCloning = false
  isCreate: boolean
  isLinked: 'left' | 'right' | 'center' | false

  constructor(
    data: Data,
    viewport: TLBounds,
    point: number[],
    isCreate = false,
    isLinked: 'left' | 'right' | 'center' | false = false
  ) {
    super(viewport)
    this.origin = point
    this.snapshot = getTranslateSnapshot(data, isLinked)
    this.isCreate = isCreate
    this.isLinked = isLinked
  }

  start = (data: Data) => {
    const { bindingsToDelete } = this.snapshot

    this.createSnapInfo(data)

    if (bindingsToDelete.length === 0) return data

    const nextBindings: Patch<Record<string, TLDrawBinding>> = {}

    bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = undefined))

    return {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            bindings: nextBindings,
          },
        },
      },
    }
  }

  update = (
    data: Data,
    point: number[],
    shiftKey = false,
    altKey = false,
    metaKey = false,
    viewPort = {} as TLBounds
  ) => {
    const { selectedIds, initialParentChildren, initialShapes, bindingsToDelete } = this.snapshot

    const { currentPageId } = data.appState

    const nextBindings: Patch<Record<string, TLDrawBinding>> = {}

    const nextShapes: Patch<Record<string, TLDrawShape>> = {}

    const nextPageState: Patch<TLPageState> = {}

    let delta = Vec.sub(point, this.origin)

    let didChangeCloning = false

    if (!this.isCreate) {
      if (altKey && !this.isCloning) {
        this.isCloning = true
        didChangeCloning = true
      } else if (!altKey && this.isCloning) {
        this.isCloning = false
        didChangeCloning = true
      }
    }

    if (shiftKey) {
      if (Math.abs(delta[0]) < Math.abs(delta[1])) {
        delta[0] = 0
      } else {
        delta[1] = 0
      }
    }

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

    const change = speed - this.speed

    this.speed = this.speed + change * (change > 1 ? 0.5 : 0.15)

    this.snapLines = []

    const { zoom } = data.document.pageStates[currentPageId].camera

    if (
      ((data.settings.isSnapping && !metaKey) || (!data.settings.isSnapping && metaKey)) &&
      this.speed * zoom < SLOW_SPEED &&
      this.snapInfo.state === 'ready'
    ) {
      const bounds = Utils.getBoundsWithCenter(
        Utils.translateBounds(this.snapshot.commonBounds, delta)
      )

      const snapResult = Utils.getSnapPoints(
        bounds,
        (this.isCloning ? this.snapInfo.bounds : this.snapInfo.others).filter(
          (bounds) =>
            Utils.boundsContain(this.viewport, bounds) || Utils.boundsCollide(this.viewport, bounds)
        ),
        SNAP_DISTANCE / zoom
      )

      if (snapResult) {
        this.snapLines = snapResult.snapLines
        delta = Vec.sub(delta, snapResult.offset)
      }
    }

    // We've now calculated the "delta", or difference between the
    // cursor's position (real or adjusted by snaps or axis locking)
    // and the cursor's original position ("origin").

    // The "movement" is the actual change of position between this
    // computed position and the previous computed position.

    const movement = Vec.sub(delta, this.prev)

    this.prev = delta

    // If cloning...
    if (this.isCloning) {
      // Not Cloning -> Cloning
      if (didChangeCloning) {
        if (this.cloneInfo.state === 'empty') {
          this.createCloneInfo(data)
        }

        if (this.cloneInfo.state === 'empty') {
          throw Error
        }

        const { clones, clonedBindings } = this.cloneInfo

        this.isCloning = true

        // Put back any bindings we deleted
        bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = binding))

        // Move original shapes back to start
        initialShapes.forEach((shape) => (nextShapes[shape.id] = { point: shape.point }))

        // Add the clones to the page
        clones.forEach((clone) => {
          nextShapes[clone.id] = { ...clone, point: Vec.round(Vec.add(clone.point, delta)) }

          // Add clones to non-selected parents
          if (
            clone.parentId !== data.appState.currentPageId &&
            !selectedIds.includes(clone.parentId)
          ) {
            const children =
              nextShapes[clone.parentId]?.children || initialParentChildren[clone.parentId]

            if (!children.includes(clone.id)) {
              nextShapes[clone.parentId] = {
                ...nextShapes[clone.parentId],
                children: [...children, clone.id],
              }
            }
          }
        })

        // Add the cloned bindings
        for (const binding of clonedBindings) {
          nextBindings[binding.id] = binding
        }

        // Set the selected ids to the clones
        nextPageState.selectedIds = clones.map((clone) => clone.id)
      }

      if (this.cloneInfo.state === 'empty') throw Error

      const { clones } = this.cloneInfo

      // Either way, move the clones
      clones.forEach((clone) => {
        const current = (nextShapes[clone.id] ||
          TLDR.getShape(data, clone.id, data.appState.currentPageId)) as TLDrawShape

        if (!current.point) throw Error('No point on that clone!')

        nextShapes[clone.id] = {
          ...nextShapes[clone.id],
          point: Vec.round(Vec.add(current.point, movement)),
        }
      })
    } else {
      // If not cloning...

      // Cloning -> Not Cloning
      if (didChangeCloning) {
        if (this.cloneInfo.state === 'empty') throw Error

        const { clones, clonedBindings } = this.cloneInfo

        this.isCloning = false

        // Delete the bindings

        bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = undefined))

        // Remove the clones from parents
        clones.forEach((clone) => {
          if (clone.parentId !== currentPageId) {
            nextShapes[clone.parentId] = {
              ...nextShapes[clone.parentId],
              children: initialParentChildren[clone.parentId],
            }
          }
        })

        // Delete the clones (including any parent clones)
        clones.forEach((clone) => (nextShapes[clone.id] = undefined))

        // Move the original shapes back to the cursor position
        initialShapes.forEach((shape) => {
          nextShapes[shape.id] = {
            point: Vec.round(Vec.add(shape.point, delta)),
          }
        })

        // Delete the cloned bindings
        for (const binding of clonedBindings) {
          nextBindings[binding.id] = undefined
        }

        // Set selected ids
        nextPageState.selectedIds = initialShapes.map((shape) => shape.id)
      }

      // Move the shapes by the delta
      initialShapes.forEach((shape) => {
        const current = (nextShapes[shape.id] ||
          TLDR.getShape(data, shape.id, data.appState.currentPageId)) as TLDrawShape

        if (!current.point) throw Error('No point on that clone!')

        nextShapes[shape.id] = {
          ...nextShapes[shape.id],
          point: Vec.round(Vec.add(current.point, movement)),
        }
      })
    }

    return {
      appState: {
        snapLines: this.snapLines,
      },
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: nextShapes,
            bindings: nextBindings,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: nextPageState,
        },
      },
    }
  }

  cancel = (data: Data) => {
    const { initialShapes, bindingsToDelete } = this.snapshot

    const nextBindings: Record<string, Partial<TLDrawBinding> | undefined> = {}
    const nextShapes: Record<string, Partial<TLDrawShape> | undefined> = {}
    const nextPageState: Partial<TLPageState> = {
      editingId: undefined,
      hoveredId: undefined,
    }

    // Put back any deleted bindings
    bindingsToDelete.forEach((binding) => (nextBindings[binding.id] = binding))

    if (this.isCreate) {
      initialShapes.forEach(({ id }) => (nextShapes[id] = undefined))
      nextPageState.selectedIds = []
    } else {
      // Put initial shapes back to where they started
      initialShapes.forEach(({ id, point }) => (nextShapes[id] = { ...nextShapes[id], point }))
      nextPageState.selectedIds = this.snapshot.selectedIds
    }

    if (this.cloneInfo.state === 'ready') {
      const { clones, clonedBindings } = this.cloneInfo
      // Delete clones
      clones.forEach((clone) => (nextShapes[clone.id] = undefined))

      // Delete cloned bindings
      clonedBindings.forEach((binding) => (nextBindings[binding.id] = undefined))
    }

    return {
      appState: {
        snapLines: [],
      },
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: nextShapes,
            bindings: nextBindings,
          },
        },
        pageStates: {
          [data.appState.currentPageId]: nextPageState,
        },
      },
    }
  }

  complete = (data: Data): TLDrawCommand => {
    const pageId = data.appState.currentPageId

    const { initialShapes, initialParentChildren, bindingsToDelete } = this.snapshot

    const beforeBindings: Patch<Record<string, TLDrawBinding>> = {}
    const beforeShapes: Patch<Record<string, TLDrawShape>> = {}

    const afterBindings: Patch<Record<string, TLDrawBinding>> = {}
    const afterShapes: Patch<Record<string, TLDrawShape>> = {}

    if (this.isCloning) {
      if (this.cloneInfo.state === 'empty') {
        this.createCloneInfo(data)
      }

      if (this.cloneInfo.state !== 'ready') throw Error
      const { clones, clonedBindings } = this.cloneInfo

      // Update the clones
      clones.forEach((clone) => {
        beforeShapes[clone.id] = undefined

        afterShapes[clone.id] = TLDR.getShape(data, clone.id, pageId)

        if (clone.parentId !== pageId) {
          beforeShapes[clone.parentId] = {
            ...beforeShapes[clone.parentId],
            children: initialParentChildren[clone.parentId],
          }

          afterShapes[clone.parentId] = {
            ...afterShapes[clone.parentId],
            children: TLDR.getShape<GroupShape>(data, clone.parentId, pageId).children,
          }
        }
      })

      // Update the cloned bindings
      clonedBindings.forEach((binding) => {
        beforeBindings[binding.id] = undefined
        afterBindings[binding.id] = TLDR.getBinding(data, binding.id, pageId)
      })
    } else {
      // If we aren't cloning, then update the initial shapes
      initialShapes.forEach((shape) => {
        beforeShapes[shape.id] = this.isCreate
          ? undefined
          : {
              ...beforeShapes[shape.id],
              point: shape.point,
            }

        afterShapes[shape.id] = {
          ...afterShapes[shape.id],
          ...(this.isCreate
            ? TLDR.getShape(data, shape.id, pageId)
            : { point: TLDR.getShape(data, shape.id, pageId).point }),
        }
      })
    }

    // Update the deleted bindings and any associated shapes
    bindingsToDelete.forEach((binding) => {
      beforeBindings[binding.id] = binding

      for (const id of [binding.toId, binding.fromId]) {
        // Let's also look at the bound shape...
        const shape = TLDR.getShape(data, id, pageId)

        // If the bound shape has a handle that references the deleted binding, delete that reference
        if (!shape.handles) continue

        Object.values(shape.handles)
          .filter((handle) => handle.bindingId === binding.id)
          .forEach((handle) => {
            beforeShapes[id] = { ...beforeShapes[id], handles: {} }

            afterShapes[id] = { ...afterShapes[id], handles: {} }

            // There should be before and after shapes

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            beforeShapes[id]!.handles![handle.id as keyof ArrowShape['handles']] = {
              bindingId: binding.id,
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            afterShapes[id]!.handles![handle.id as keyof ArrowShape['handles']] = {
              bindingId: undefined,
            }
          })
      }
    })

    return {
      id: 'translate',
      before: {
        appState: {
          snapLines: [],
        },
        document: {
          pages: {
            [data.appState.currentPageId]: {
              shapes: beforeShapes,
              bindings: beforeBindings,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              selectedIds: this.isCreate ? [] : [...this.snapshot.selectedIds],
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
              bindings: afterBindings,
            },
          },
          pageStates: {
            [data.appState.currentPageId]: {
              selectedIds: [...TLDR.getSelectedIds(data, data.appState.currentPageId)],
            },
          },
        },
      },
    }
  }

  private createSnapInfo = async (data: Data) => {
    const { currentPageId } = data.appState
    const page = data.document.pages[currentPageId]
    const { idsToMove } = this.snapshot

    const allBounds: TLBoundsWithCenter[] = []
    const otherBounds: TLBoundsWithCenter[] = []

    Object.values(page.shapes).forEach((shape) => {
      const bounds = Utils.getBoundsWithCenter(TLDR.getRotatedBounds(shape))
      allBounds.push(bounds)
      if (!idsToMove.has(shape.id)) {
        otherBounds.push(bounds)
      }
    })

    this.snapInfo = {
      state: 'ready',
      bounds: allBounds,
      others: otherBounds,
    }
  }

  private createCloneInfo = (data: Data) => {
    // Create clones when as they're needed.
    // Consider doing this work in a worker.

    const { currentPageId } = data.appState
    const page = data.document.pages[currentPageId]
    const { selectedIds, shapesToMove, initialParentChildren } = this.snapshot

    const cloneMap: Record<string, string> = {}
    const clonedBindingsMap: Record<string, string> = {}
    const clonedBindings: TLDrawBinding[] = []

    // Create clones of selected shapes
    const clones: TLDrawShape[] = []

    shapesToMove.forEach((shape) => {
      const newId = Utils.uniqueId()

      initialParentChildren[newId] = initialParentChildren[shape.id]

      cloneMap[shape.id] = newId

      const clone = {
        ...Utils.deepClone(shape),
        id: newId,
        parentId: shape.parentId,
        childIndex: TLDR.getChildIndexAbove(data, shape.id, currentPageId),
      }

      clones.push(clone)
    })

    clones.forEach((clone) => {
      if (clone.children !== undefined) {
        clone.children = clone.children.map((childId) => cloneMap[childId])
      }
    })

    clones.forEach((clone) => {
      if (selectedIds.includes(clone.parentId)) {
        clone.parentId = cloneMap[clone.parentId]
      }
    })

    // Potentially confusing name here: these are the ids of the
    // original shapes that were cloned, not their clones' ids.
    const clonedShapeIds = new Set(Object.keys(cloneMap))

    // Create cloned bindings for shapes where both to and from shapes are selected
    // (if the user clones, then we will create a new binding for the clones)
    Object.values(page.bindings)
      .filter((binding) => clonedShapeIds.has(binding.fromId) || clonedShapeIds.has(binding.toId))
      .forEach((binding) => {
        if (clonedShapeIds.has(binding.fromId)) {
          if (clonedShapeIds.has(binding.toId)) {
            const cloneId = Utils.uniqueId()

            const cloneBinding = {
              ...Utils.deepClone(binding),
              id: cloneId,
              fromId: cloneMap[binding.fromId] || binding.fromId,
              toId: cloneMap[binding.toId] || binding.toId,
            }

            clonedBindingsMap[binding.id] = cloneId
            clonedBindings.push(cloneBinding)
          }
        }
      })

    // Assign new binding ids to clones (or delete them!)
    clones.forEach((clone) => {
      if (clone.handles) {
        if (clone.handles) {
          for (const id in clone.handles) {
            const handle = clone.handles[id as keyof ArrowShape['handles']]
            handle.bindingId = handle.bindingId ? clonedBindingsMap[handle.bindingId] : undefined
          }
        }
      }
    })

    clones.forEach((clone) => {
      if (page.shapes[clone.id]) {
        throw Error("uh oh, we didn't clone correctly")
      }
    })

    this.cloneInfo = {
      state: 'ready',
      clones,
      clonedBindings,
    }
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function getTranslateSnapshot(
  data: Data,
  linkDirection: 'left' | 'right' | 'center' | false
) {
  const { currentPageId } = data.appState

  const page = TLDR.getPage(data, currentPageId)

  const selectedIds = TLDR.getSelectedIds(data, currentPageId)

  const ids = linkDirection
    ? TLDR.getLinkedShapes(data, currentPageId, linkDirection, false)
    : selectedIds

  const selectedShapes = ids.flatMap((id) => TLDR.getShape(data, id, currentPageId))

  const hasUnlockedShapes = selectedShapes.length > 0

  const shapesToMove: TLDrawShape[] = selectedShapes
    .filter((shape) => !ids.includes(shape.parentId))
    .flatMap((shape) => {
      return shape.children
        ? [shape, ...shape.children!.map((childId) => TLDR.getShape(data, childId, currentPageId))]
        : [shape]
    })

  const idsToMove = new Set(shapesToMove.map((shape) => shape.id))

  const bindingsToDelete: ArrowBinding[] = []

  Object.values(page.bindings)
    .filter((binding) => idsToMove.has(binding.fromId) || idsToMove.has(binding.toId))
    .forEach((binding) => {
      if (idsToMove.has(binding.fromId)) {
        if (!idsToMove.has(binding.toId)) {
          bindingsToDelete.push(binding)
        }
      }
    })

  const initialParentChildren: Record<string, string[]> = {}

  Array.from(new Set(shapesToMove.map((s) => s.parentId)).values())
    .filter((id) => id !== page.id)
    .forEach((id) => {
      const shape = TLDR.getShape(data, id, currentPageId)
      initialParentChildren[id] = shape.children!
    })

  const commonBounds = Utils.getCommonBounds(shapesToMove.map(TLDR.getRotatedBounds))

  return {
    selectedIds,
    hasUnlockedShapes,
    initialParentChildren,
    idsToMove,
    shapesToMove,
    bindingsToDelete,
    commonBounds,
    initialShapes: shapesToMove.map(({ id, point, parentId }) => ({
      id,
      point,
      parentId,
    })),
  }
}

export type TranslateSnapshot = ReturnType<typeof getTranslateSnapshot>
