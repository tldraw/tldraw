import { TLBounds, TLPageState, TLTransformInfo, Utils } from '@tldraw/core'
import { intersectRayBounds, intersectRayEllipse, intersectRayLineSegment } from '@tldraw/intersect'
import { Vec } from '@tldraw/vec'
import { BINDING_DISTANCE } from '~constants'
import {
  ArrowShape,
  ShapesWithProp,
  TDBinding,
  TDExportType,
  TDHandle,
  TDPage,
  TDShape,
  TDShapeType,
  TDSnapshot,
  TldrawCommand,
  TldrawPatch,
} from '~types'
import { deepCopy } from './StateManager/copy'
import { getShapeUtil } from './shapes'
import type { TDShapeUtil } from './shapes/TDShapeUtil'
import { getTrianglePoints } from './shapes/TriangleUtil/triangleHelpers'

const isDev = process.env.NODE_ENV === 'development'
export class TLDR {
  static getShapeUtil<T extends TDShape>(type: T['type']): TDShapeUtil<T>
  static getShapeUtil<T extends TDShape>(shape: T): TDShapeUtil<T>
  static getShapeUtil<T extends TDShape>(shape: T | T['type']) {
    return getShapeUtil<T>(shape)
  }

  static getSelectedShapes(data: TDSnapshot, pageId: string) {
    const page = TLDR.getPage(data, pageId)
    const selectedIds = TLDR.getSelectedIds(data, pageId)
    return selectedIds.map((id) => page.shapes[id])
  }

  static screenToWorld(data: TDSnapshot, point: number[]) {
    const camera = TLDR.getPageState(data, data.appState.currentPageId).camera
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  static getCameraZoom(zoom: number) {
    return Utils.clamp(zoom, 0.1, 5)
  }

  static getPage(data: TDSnapshot, pageId: string): TDPage {
    return data.document.pages[pageId]
  }

  static getPageState(data: TDSnapshot, pageId: string): TLPageState {
    return data.document.pageStates[pageId]
  }

  static getSelectedIds(data: TDSnapshot, pageId: string): string[] {
    return TLDR.getPageState(data, pageId).selectedIds
  }

  static getShapes(data: TDSnapshot, pageId: string): TDShape[] {
    return Object.values(TLDR.getPage(data, pageId).shapes)
  }

  static getCamera(data: TDSnapshot, pageId: string): TLPageState['camera'] {
    return TLDR.getPageState(data, pageId).camera
  }

  static getShape<T extends TDShape = TDShape>(
    data: TDSnapshot,
    shapeId: string,
    pageId: string
  ): T {
    return TLDR.getPage(data, pageId).shapes[shapeId] as T
  }

  static getCenter<T extends TDShape>(shape: T) {
    return TLDR.getShapeUtil(shape).getCenter(shape)
  }

  static getBounds<T extends TDShape>(shape: T) {
    return TLDR.getShapeUtil(shape).getBounds(shape)
  }

  static getRotatedBounds<T extends TDShape>(shape: T) {
    return TLDR.getShapeUtil(shape).getRotatedBounds(shape)
  }

  static getSelectedBounds(data: TDSnapshot): TLBounds {
    return Utils.getCommonBounds(
      TLDR.getSelectedShapes(data, data.appState.currentPageId).map((shape) =>
        TLDR.getShapeUtil(shape).getBounds(shape)
      )
    )
  }

  static getParentId(data: TDSnapshot, id: string, pageId: string) {
    return TLDR.getShape(data, id, pageId).parentId
  }

  // static getPointedId(data: TDSnapshot, id: string, pageId: string): string {
  //   const page = TLDR.getPage(data, pageId)
  //   const pageState = TLDR.getPageState(data, data.appState.currentPageId)
  //   const shape = TLDR.getShape(data, id, pageId)
  //   if (!shape) return id

  //   return shape.parentId === pageState.currentParentId || shape.parentId === page.id
  //     ? id
  //     : TLDR.getPointedId(data, shape.parentId, pageId)
  // }

  // static getDrilledPointedId(data: TDSnapshot, id: string, pageId: string): string {
  //   const shape = TLDR.getShape(data, id, pageId)
  //   const { currentPageId } = data.appState
  //   const { currentParentId, pointedId } = TLDR.getPageState(data, data.appState.currentPageId)

  //   return shape.parentId === currentPageId ||
  //     shape.parentId === pointedId ||
  //     shape.parentId === currentParentId
  //     ? id
  //     : TLDR.getDrilledPointedId(data, shape.parentId, pageId)
  // }

  // static getTopParentId(data: TDSnapshot, id: string, pageId: string): string {
  //   const page = TLDR.getPage(data, pageId)
  //   const pageState = TLDR.getPageState(data, pageId)
  //   const shape = TLDR.getShape(data, id, pageId)

  //   if (shape.parentId === shape.id) {
  //     throw Error(`Shape has the same id as its parent! ${shape.id}`)
  //   }

  //   return shape.parentId === page.id || shape.parentId === pageState.currentParentId
  //     ? id
  //     : TLDR.getTopParentId(data, shape.parentId, pageId)
  // }

  // Get an array of a shape id and its descendant shapes' ids
  static getDocumentBranch(data: TDSnapshot, id: string, pageId: string): string[] {
    const shape = TLDR.getShape(data, id, pageId)

    if (shape.children === undefined) return [id]

    return [
      id,
      ...shape.children.flatMap((childId) => TLDR.getDocumentBranch(data, childId, pageId)),
    ]
  }

  // Get a deep array of unproxied shapes and their descendants
  static getSelectedBranchSnapshot<K>(
    data: TDSnapshot,
    pageId: string,
    fn: (shape: TDShape) => K
  ): ({ id: string } & K)[]
  static getSelectedBranchSnapshot(data: TDSnapshot, pageId: string): TDShape[]
  static getSelectedBranchSnapshot<K>(
    data: TDSnapshot,
    pageId: string,
    fn?: (shape: TDShape) => K
  ): (TDShape | K)[] {
    const page = TLDR.getPage(data, pageId)

    const copies = TLDR.getSelectedIds(data, pageId)
      .flatMap((id) => TLDR.getDocumentBranch(data, id, pageId).map((id) => page.shapes[id]))
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // Get a shallow array of unproxied shapes
  static getSelectedShapeSnapshot(data: TDSnapshot, pageId: string): TDShape[]
  static getSelectedShapeSnapshot<K>(
    data: TDSnapshot,
    pageId: string,
    fn?: (shape: TDShape) => K
  ): ({ id: string } & K)[]
  static getSelectedShapeSnapshot<K>(
    data: TDSnapshot,
    pageId: string,
    fn?: (shape: TDShape) => K
  ): (TDShape | K)[] {
    const copies = TLDR.getSelectedShapes(data, pageId)
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // For a given array of shape ids, an array of all other shapes that may be affected by a mutation to it.
  // Use this to decide which shapes to clone as before / after for a command.
  static getAllEffectedShapeIds(data: TDSnapshot, ids: string[], pageId: string): string[] {
    const page = TLDR.getPage(data, pageId)

    const visited = new Set(ids)

    ids.forEach((id) => {
      const shape = page.shapes[id]

      // Add descendant shapes
      function collectDescendants(shape: TDShape): void {
        if (shape.children === undefined) return
        shape.children
          .filter((childId) => !visited.has(childId))
          .forEach((childId) => {
            visited.add(childId)
            collectDescendants(page.shapes[childId])
          })
      }

      collectDescendants(shape)

      // Add asecendant shapes
      function collectAscendants(shape: TDShape): void {
        const parentId = shape.parentId
        if (parentId === page.id) return
        if (visited.has(parentId)) return
        visited.add(parentId)
        collectAscendants(page.shapes[parentId])
      }

      collectAscendants(shape)

      // Add bindings that are to or from any of the visited shapes (this does not have to be recursive)
      visited.forEach((id) => {
        Object.values(page.bindings)
          .filter((binding) => binding.fromId === id || binding.toId === id)
          .forEach((binding) => visited.add(binding.fromId === id ? binding.toId : binding.fromId))
      })
    })

    // Return the unique array of visited shapes
    return Array.from(visited.values())
  }

  static getLinkedShapeIds(
    data: TDSnapshot,
    pageId: string,
    direction: 'center' | 'left' | 'right',
    includeArrows = true
  ) {
    const selectedIds = TLDR.getSelectedIds(data, pageId)

    const page = TLDR.getPage(data, pageId)

    const linkedIds = new Set<string>(selectedIds)

    const checkedIds = new Set<string>()

    const idsToCheck = [...selectedIds]

    const arrows = new Set(
      Object.values(page.shapes).filter((shape) => {
        return (
          shape.type === TDShapeType.Arrow &&
          (shape.handles.start.bindingId || shape.handles?.end.bindingId)
        )
      }) as ArrowShape[]
    )

    while (idsToCheck.length) {
      const id = idsToCheck.pop()

      if (!(id && arrows.size)) break

      if (checkedIds.has(id)) continue

      checkedIds.add(id)

      arrows.forEach((arrow) => {
        const {
          handles: {
            start: { bindingId: startBindingId },
            end: { bindingId: endBindingId },
          },
        } = arrow

        const startBinding = startBindingId ? page.bindings[startBindingId] : null
        const endBinding = endBindingId ? page.bindings[endBindingId] : null

        let hit = false

        if (startBinding && startBinding.toId === id) {
          if (direction === 'center') {
            hit = true
          } else if (arrow.decorations?.start && endBinding) {
            // The arrow is pointing to this shape at its start
            hit = direction === 'left'
          } else {
            // The arrow is pointing away from this shape
            hit = direction === 'right'
          }

          if (hit) {
            // This arrow is bound to this shape
            if (includeArrows) linkedIds.add(arrow.id)
            linkedIds.add(id)

            if (endBinding) {
              linkedIds.add(endBinding.toId)
              idsToCheck.push(endBinding.toId)
            }
          }
        } else if (endBinding && endBinding.toId === id) {
          // This arrow is bound to this shape at its end
          if (direction === 'center') {
            hit = true
          } else if (arrow.decorations?.end && startBinding) {
            // The arrow is pointing to this shape
            hit = direction === 'left'
          } else {
            // The arrow is pointing away from this shape
            hit = direction === 'right'
          }

          if (hit) {
            if (includeArrows) linkedIds.add(arrow.id)
            linkedIds.add(id)

            if (startBinding) {
              linkedIds.add(startBinding.toId)
              idsToCheck.push(startBinding.toId)
            }
          }
        }

        if (
          (!startBinding || linkedIds.has(startBinding.toId)) &&
          (!endBinding || linkedIds.has(endBinding.toId))
        ) {
          arrows.delete(arrow)
        }
      })
    }

    return Array.from(linkedIds.values())
  }

  static getChildIndexAbove(data: TDSnapshot, id: string, pageId: string): number {
    const page = data.document.pages[pageId]
    const shape = page.shapes[id]

    let siblings: TDShape[]

    if (shape.parentId === page.id) {
      siblings = Object.values(page.shapes)
        .filter((shape) => shape.parentId === page.id)
        .sort((a, b) => a.childIndex - b.childIndex)
    } else {
      const parent = page.shapes[shape.parentId]
      if (!parent.children) throw Error('No children in parent!')
      siblings = parent.children
        .map((childId) => page.shapes[childId])
        .sort((a, b) => a.childIndex - b.childIndex)
    }

    const index = siblings.indexOf(shape)

    const nextSibling = siblings[index + 1]

    if (!nextSibling) return shape.childIndex + 1

    return nextSibling.childIndex
  }

  /* -------------------------------------------------- */
  /*                      Mutations                     */
  /* -------------------------------------------------- */

  static getBeforeShape<T extends TDShape>(shape: T, change: Partial<T>): Partial<T> {
    return Object.fromEntries(
      Object.keys(change).map((k) => [k, shape[k as keyof T]])
    ) as Partial<T>
  }

  static mutateShapes<T extends TDShape>(
    data: TDSnapshot,
    ids: string[],
    fn: (shape: T, i: number) => Partial<T> | void,
    pageId: string,
    forceChildrenTraversal = false
  ): {
    before: Record<string, Partial<T>>
    after: Record<string, Partial<T>>
    data: TDSnapshot
  } {
    const beforeShapes: Record<string, Partial<T>> = {}
    const afterShapes: Record<string, Partial<T>> = {}

    ids.forEach((id, i) => {
      const shape = TLDR.getShape<T>(data, id, pageId)
      if (shape.isLocked) return
      if (shape?.type === 'group' && (ids.length === 1 || forceChildrenTraversal)) {
        shape.children.forEach((id, i) => {
          const shape = TLDR.getShape<T>(data, id, pageId)
          if (shape.isLocked) return
          const change = fn(shape, i)
          if (change) {
            beforeShapes[id] = TLDR.getBeforeShape(shape, change)
            afterShapes[id] = change
          }
        })
      }
      const change = fn(shape, i)
      if (change) {
        beforeShapes[id] = TLDR.getBeforeShape(shape, change)
        afterShapes[id] = change
      }
    })

    const dataWithMutations = Utils.deepMerge(data, {
      document: {
        pages: {
          [data.appState.currentPageId]: {
            shapes: afterShapes,
          },
        },
      },
    })

    return {
      before: beforeShapes,
      after: afterShapes,
      data: dataWithMutations,
    }
  }

  static createShapes(data: TDSnapshot, shapes: TDShape[], pageId: string): TldrawCommand {
    const before: TldrawPatch = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              ...Object.fromEntries(
                shapes.flatMap((shape) => {
                  const results: [string, Partial<TDShape> | undefined][] = [[shape.id, undefined]]

                  // If the shape is a child of another shape, also save that shape
                  if (shape.parentId !== pageId) {
                    const parent = TLDR.getShape(data, shape.parentId, pageId)
                    if (!parent.children) throw Error('No children in parent!')
                    results.push([parent.id, { children: parent.children }])
                  }

                  return results
                })
              ),
            },
          },
        },
      },
    }

    const after: TldrawPatch = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              shapes: {
                ...Object.fromEntries(
                  shapes.flatMap((shape) => {
                    const results: [string, Partial<TDShape> | undefined][] = [[shape.id, shape]]

                    // If the shape is a child of a different shape, update its parent
                    if (shape.parentId !== pageId) {
                      const parent = TLDR.getShape(data, shape.parentId, pageId)
                      if (!parent.children) throw Error('No children in parent!')
                      results.push([parent.id, { children: [...parent.children, shape.id] }])
                    }

                    return results
                  })
                ),
              },
            },
          },
        },
      },
    }

    return {
      before,
      after,
    }
  }

  static deleteShapes(
    data: TDSnapshot,
    shapes: TDShape[] | string[],
    pageId?: string
  ): TldrawCommand {
    pageId = pageId ? pageId : data.appState.currentPageId

    const page = TLDR.getPage(data, pageId)

    const shapeIds =
      typeof shapes[0] === 'string'
        ? (shapes as string[])
        : (shapes as TDShape[]).map((shape) => shape.id)

    const before: TldrawPatch = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              // These are the shapes that we're going to delete
              ...Object.fromEntries(
                shapeIds.flatMap((id) => {
                  const shape = page.shapes[id]
                  const results: [string, Partial<TDShape> | undefined][] = [[shape.id, shape]]

                  // If the shape is a child of another shape, also add that shape
                  if (shape.parentId !== pageId) {
                    const parent = page.shapes[shape.parentId]
                    if (!parent.children) throw Error('No children in parent!')
                    results.push([parent.id, { children: parent.children }])
                  }

                  return results
                })
              ),
            },
            bindings: {
              // These are the bindings that we're going to delete
              ...Object.fromEntries(
                Object.values(page.bindings)
                  .filter((binding) => {
                    return shapeIds.includes(binding.fromId) || shapeIds.includes(binding.toId)
                  })
                  .map((binding) => {
                    return [binding.id, binding]
                  })
              ),
            },
          },
        },
      },
    }

    const after: TldrawPatch = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              ...Object.fromEntries(
                shapeIds.flatMap((id) => {
                  const shape = page.shapes[id]
                  const results: [string, Partial<TDShape> | undefined][] = [[shape.id, undefined]]

                  // If the shape is a child of a different shape, update its parent
                  if (shape.parentId !== page.id) {
                    const parent = page.shapes[shape.parentId]

                    if (!parent.children) throw Error('No children in parent!')

                    results.push([
                      parent.id,
                      { children: parent.children.filter((id) => id !== shape.id) },
                    ])
                  }

                  return results
                })
              ),
            },
          },
        },
      },
    }

    return {
      before,
      after,
    }
  }

  static onSessionComplete<T extends TDShape>(shape: T) {
    const delta = TLDR.getShapeUtil(shape).onSessionComplete?.(shape)
    if (!delta) return shape
    return { ...shape, ...delta }
  }

  static onChildrenChange<T extends TDShape>(data: TDSnapshot, shape: T, pageId: string) {
    if (!shape.children) return

    const delta = TLDR.getShapeUtil(shape).onChildrenChange?.(
      shape,
      shape.children.map((id) => TLDR.getShape(data, id, pageId))
    )

    if (!delta) return shape

    return { ...shape, ...delta }
  }

  static updateArrowBindings(page: TDPage, arrowShape: ArrowShape) {
    const result = {
      start: deepCopy(arrowShape.handles.start),
      end: deepCopy(arrowShape.handles.end),
    }
    type HandleInfo = {
      handle: TDHandle
      point: number[] // in page space
    } & (
      | {
          isBound: false
        }
      | {
          isBound: true
          hasDecoration: boolean
          binding: TDBinding
          util: TDShapeUtil<TDShape, any>
          target: TDShape
          bounds: TLBounds
          expandedBounds: TLBounds
          intersectBounds: TLBounds
          center: number[]
        }
    )
    let start: HandleInfo = {
      isBound: false,
      handle: arrowShape.handles.start,
      point: Vec.add(arrowShape.handles.start.point, arrowShape.point),
    }
    let end: HandleInfo = {
      isBound: false,
      handle: arrowShape.handles.end,
      point: Vec.add(arrowShape.handles.end.point, arrowShape.point),
    }
    if (arrowShape.handles.start.bindingId) {
      const hasDecoration = arrowShape.decorations?.start !== undefined
      const handle = arrowShape.handles.start
      const binding = page.bindings[arrowShape.handles.start.bindingId]
      if (!binding)
        throw Error(
          "Could not find a binding to match the start handle's bindingId: " +
            arrowShape.handles.start.bindingId
        )
      const target = page.shapes[binding.toId]
      const util = TLDR.getShapeUtil(target)
      const bounds = util.getBounds(target)
      const expandedBounds = util.getExpandedBounds(target)
      const intersectBounds = hasDecoration ? Utils.expandBounds(bounds, binding.distance) : bounds
      const { minX, minY, width, height } = expandedBounds
      const anchorPoint = Vec.add(
        [minX, minY],
        Vec.mulV([width, height], Vec.rotWith(binding.point, [0.5, 0.5], target.rotation || 0))
      )
      start = {
        isBound: true,
        hasDecoration,
        binding,
        handle,
        point: anchorPoint,
        util,
        target,
        bounds,
        expandedBounds,
        intersectBounds,
        center: util.getCenter(target),
      }
    }
    if (arrowShape.handles.end.bindingId) {
      const hasDecoration = arrowShape.decorations?.end !== undefined
      const handle = arrowShape.handles.end
      const binding = page.bindings[arrowShape.handles.end.bindingId]
      if (!binding) throw Error("Could not find a binding to match the end handle's bindingId")
      const target = page.shapes[binding.toId]
      const util = TLDR.getShapeUtil(target)
      const bounds = util.getBounds(target)
      const expandedBounds = util.getExpandedBounds(target)
      const intersectBounds = hasDecoration ? Utils.expandBounds(bounds, binding.distance) : bounds
      const { minX, minY, width, height } = expandedBounds
      const anchorPoint = Vec.add(
        [minX, minY],
        Vec.mulV([width, height], Vec.rotWith(binding.point, [0.5, 0.5], target.rotation || 0))
      )
      end = {
        isBound: true,
        hasDecoration,
        binding,
        handle,
        point: anchorPoint,
        util,
        target,
        bounds,
        expandedBounds,
        intersectBounds,
        center: util.getCenter(target),
      }
    }

    for (const ID of ['end', 'start'] as const) {
      const A = ID === 'start' ? start : end
      const B = ID === 'start' ? end : start
      if (A.isBound) {
        if (!A.binding.distance) {
          // If the binding distance is zero, then the arrow is bound to a specific point
          // in the target shape. The resulting handle should be exactly at that point.
          result[ID].point = Vec.sub(A.point, arrowShape.point)
        } else {
          // We'll need to figure out the handle's true point based on some intersections
          // between the opposite handle point and this handle point. This is different
          // for each type of shape.
          const direction = Vec.uni(Vec.sub(A.point, B.point))
          switch (A.target.type) {
            case TDShapeType.Ellipse: {
              const hits = intersectRayEllipse(
                B.point,
                direction,
                A.center,
                A.target.radius[0] + (A.hasDecoration ? A.binding.distance : 0),
                A.target.radius[1] + (A.hasDecoration ? A.binding.distance : 0),
                A.target.rotation || 0
              ).points.sort((a, b) => Vec.dist(a, B.point) - Vec.dist(b, B.point))
              if (hits[0] !== undefined) {
                result[ID].point = Vec.toFixed(Vec.sub(hits[0], arrowShape.point))
              }
              break
            }
            case TDShapeType.Triangle: {
              const targetPoint = A.target.point
              const points = getTrianglePoints(
                A.target.size,
                A.hasDecoration ? BINDING_DISTANCE : 0,
                A.target.rotation
              ).map((pt) => Vec.add(pt, targetPoint))
              const hits = Utils.pointsToLineSegments(points, true)
                .map(([p0, p1]) => intersectRayLineSegment(B.point, direction, p0, p1))
                .filter((intersection) => intersection.didIntersect)
                .flatMap((intersection) => intersection.points)
                .sort((a, b) => Vec.dist(a, B.point) - Vec.dist(b, B.point))
              if (hits[0] !== undefined) {
                result[ID].point = Vec.toFixed(Vec.sub(hits[0], arrowShape.point))
              }
              break
            }
            default: {
              const hits = intersectRayBounds(
                B.point,
                direction,
                A.intersectBounds,
                A.target.rotation
              )
                .filter((int) => int.didIntersect)
                .map((int) => int.points[0])
                .sort((a, b) => Vec.dist(a, B.point) - Vec.dist(b, B.point))
              if (!hits[0]) continue
              let bHit: number[] | undefined = undefined
              if (B.isBound) {
                const bHits = intersectRayBounds(
                  B.point,
                  direction,
                  B.intersectBounds,
                  B.target.rotation
                )
                  .filter((int) => int.didIntersect)
                  .map((int) => int.points[0])
                  .sort((a, b) => Vec.dist(a, B.point) - Vec.dist(b, B.point))
                bHit = bHits[0]
              }
              if (
                B.isBound &&
                (hits.length < 2 ||
                  (bHit &&
                    hits[0] &&
                    Math.ceil(Vec.dist(hits[0], bHit)) < BINDING_DISTANCE * 2.5) ||
                  Utils.boundsContain(A.expandedBounds, B.expandedBounds) ||
                  Utils.boundsCollide(A.expandedBounds, B.expandedBounds))
              ) {
                // If the other handle is bound, and if we need to fallback to the short arrow method...
                const shortArrowDirection = Vec.uni(Vec.sub(B.point, A.point))
                const shortArrowHits = intersectRayBounds(
                  A.point,
                  shortArrowDirection,
                  A.bounds,
                  A.target.rotation
                )
                  .filter((int) => int.didIntersect)
                  .map((int) => int.points[0])
                if (!shortArrowHits[0]) continue
                result[ID].point = Vec.toFixed(Vec.sub(shortArrowHits[0], arrowShape.point))
                result[ID === 'start' ? 'end' : 'start'].point = Vec.toFixed(
                  Vec.add(
                    Vec.sub(shortArrowHits[0], arrowShape.point),
                    Vec.mul(
                      shortArrowDirection,
                      Math.min(
                        Vec.dist(shortArrowHits[0], B.point),
                        BINDING_DISTANCE *
                          2.5 *
                          (Utils.boundsContain(B.bounds, A.intersectBounds) ? -1 : 1)
                      )
                    )
                  )
                )
              } else if (
                !B.isBound &&
                ((hits[0] && Vec.dist(hits[0], B.point) < BINDING_DISTANCE * 2.5) ||
                  Utils.pointInBounds(B.point, A.intersectBounds))
              ) {
                // Short arrow time!
                const shortArrowDirection = Vec.uni(Vec.sub(A.center, B.point))
                return TLDR.getShapeUtil<ArrowShape>(arrowShape).onHandleChange?.(arrowShape, {
                  [ID]: {
                    ...arrowShape.handles[ID],
                    point: Vec.toFixed(
                      Vec.add(
                        Vec.sub(B.point, arrowShape.point),
                        Vec.mul(shortArrowDirection, BINDING_DISTANCE * 2.5)
                      )
                    ),
                  },
                })
              } else if (hits[0]) {
                result[ID].point = Vec.toFixed(Vec.sub(hits[0], arrowShape.point))
              }
            }
          }
        }
      }
    }

    return TLDR.getShapeUtil<ArrowShape>(arrowShape).onHandleChange?.(arrowShape, result)
  }

  static transform<T extends TDShape>(shape: T, bounds: TLBounds, info: TLTransformInfo<T>) {
    const delta = TLDR.getShapeUtil(shape).transform(shape, bounds, info)
    if (!delta) return shape
    return { ...shape, ...delta }
  }

  static transformSingle<T extends TDShape>(shape: T, bounds: TLBounds, info: TLTransformInfo<T>) {
    const delta = TLDR.getShapeUtil(shape).transformSingle(shape, bounds, info)
    if (!delta) return shape
    return { ...shape, ...delta }
  }

  /**
   * Rotate a shape around an origin point.
   * @param shape a shape.
   * @param center the shape's center in page space.
   * @param origin the page point to rotate around.
   * @param rotation the amount to rotate the shape.
   */
  static getRotatedShapeMutation<T extends TDShape>(
    shape: T, // in page space
    center: number[], // in page space
    origin: number[], // in page space (probably the center of common bounds)
    delta: number // The shape's rotation delta
  ): Partial<T> | void {
    // The shape's center relative to the shape's point
    const relativeCenter = Vec.sub(center, shape.point)

    // Rotate the center around the origin
    const rotatedCenter = Vec.rotWith(center, origin, delta)

    // Get the top left point relative to the rotated center
    const nextPoint = Vec.toFixed(Vec.sub(rotatedCenter, relativeCenter))

    // If the shape has handles, we need to rotate the handles instead
    // of rotating the shape. Shapes with handles should never be rotated,
    // because that makes a lot of other things incredible difficult.
    if (shape.handles !== undefined) {
      const change = this.getShapeUtil(shape).onHandleChange?.(
        // Base the change on a shape with the next point
        { ...shape, point: nextPoint },
        Object.fromEntries(
          Object.entries(shape.handles).map(([handleId, handle]) => {
            // Rotate each handle's point around the shape's center
            // (in relative shape space, as the handle's point will be).
            const point = Vec.toFixed(Vec.rotWith(handle.point, relativeCenter, delta))
            return [handleId, { ...handle, point }]
          })
        ) as T['handles']
      )

      return change
    }

    // If the shape has no handles, move the shape to the new point
    // and set the rotation.

    // Clamp the next rotation between 0 and PI2
    const nextRotation = Utils.clampRadians((shape.rotation || 0) + delta)

    return {
      point: nextPoint,
      rotation: nextRotation,
    } as Partial<T>
  }

  /* -------------------------------------------------- */
  /*                       Parents                      */
  /* -------------------------------------------------- */

  static updateParents(data: TDSnapshot, pageId: string, changedShapeIds: string[]): void {
    const page = TLDR.getPage(data, pageId)

    if (changedShapeIds.length === 0) return

    const { shapes } = TLDR.getPage(data, pageId)

    const parentToUpdateIds = Array.from(
      new Set(changedShapeIds.map((id) => shapes[id].parentId).values())
    ).filter((id) => id !== page.id)

    for (const parentId of parentToUpdateIds) {
      const parent = shapes[parentId]

      if (!parent.children) {
        throw Error('A shape is parented to a shape without a children array.')
      }

      TLDR.onChildrenChange(data, parent, pageId)
    }

    TLDR.updateParents(data, pageId, parentToUpdateIds)
  }

  /* -------------------------------------------------- */
  /*                      Bindings                      */
  /* -------------------------------------------------- */

  static getBinding(data: TDSnapshot, id: string, pageId: string): TDBinding {
    return TLDR.getPage(data, pageId).bindings[id]
  }

  static getBindings(data: TDSnapshot, pageId: string): TDBinding[] {
    const page = TLDR.getPage(data, pageId)
    return Object.values(page.bindings)
  }

  static getBindableShapeIds(data: TDSnapshot) {
    return TLDR.getShapes(data, data.appState.currentPageId)
      .filter((shape) => TLDR.getShapeUtil(shape).canBind)
      .sort((a, b) => b.childIndex - a.childIndex)
      .map((shape) => shape.id)
  }

  static getBindingsWithShapeIds(data: TDSnapshot, ids: string[], pageId: string): TDBinding[] {
    return Array.from(
      new Set(
        TLDR.getBindings(data, pageId).filter((binding) => {
          return ids.includes(binding.toId) || ids.includes(binding.fromId)
        })
      ).values()
    )
  }

  static getRelatedBindings(data: TDSnapshot, ids: string[], pageId: string): TDBinding[] {
    const changedShapeIds = new Set(ids)

    const page = TLDR.getPage(data, pageId)

    // Find all bindings that we need to update
    const bindingsArr = Object.values(page.bindings)

    // Start with bindings that are directly bound to our changed shapes
    const bindingsToUpdate = new Set(
      bindingsArr.filter(
        (binding) => changedShapeIds.has(binding.toId) || changedShapeIds.has(binding.fromId)
      )
    )

    // Next, look for other bindings that effect the same shapes
    let prevSize = bindingsToUpdate.size
    let delta = -1

    while (delta !== 0) {
      bindingsToUpdate.forEach((binding) => {
        const fromId = binding.fromId

        for (const otherBinding of bindingsArr) {
          if (otherBinding.fromId === fromId) {
            bindingsToUpdate.add(otherBinding)
          }

          if (otherBinding.toId === fromId) {
            bindingsToUpdate.add(otherBinding)
          }
        }
      })

      // Continue until we stop finding new bindings to update
      delta = bindingsToUpdate.size - prevSize

      prevSize = bindingsToUpdate.size
    }

    return Array.from(bindingsToUpdate.values())
  }

  static copyStringToClipboard = (string: string) => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.write([
          new ClipboardItem({
            'text/plain': new Blob([string], { type: 'text/plain' }),
          }),
        ])
      }
    } catch (e) {
      const textarea = document.createElement('textarea')
      textarea.setAttribute('position', 'fixed')
      textarea.setAttribute('top', '0')
      textarea.setAttribute('readonly', 'true')
      textarea.setAttribute('contenteditable', 'true')
      textarea.style.position = 'fixed'
      textarea.value = string
      document.body.appendChild(textarea)
      textarea.focus()
      textarea.select()

      try {
        const range = document.createRange()
        range.selectNodeContents(textarea)
        const sel = window.getSelection()
        if (sel) {
          sel.removeAllRanges()
          sel.addRange(range)
          textarea.setSelectionRange(0, textarea.value.length)
        }
        document.execCommand('copy')
      } catch (err) {
        null // Could not copy to clipboard
      } finally {
        document.body.removeChild(textarea)
      }
    }
  }

  /* -------------------------------------------------- */
  /*                       Groups                       */
  /* -------------------------------------------------- */

  static flattenShape = (data: TDSnapshot, shape: TDShape): TDShape[] => {
    return [
      shape,
      ...(shape.children ?? [])
        .map((childId) => TLDR.getShape(data, childId, data.appState.currentPageId))
        .sort((a, b) => a.childIndex - b.childIndex)
        .flatMap((shape) => TLDR.flattenShape(data, shape)),
    ]
  }

  static flattenPage = (data: TDSnapshot, pageId: string): TDShape[] => {
    return Object.values(data.document.pages[pageId].shapes)
      .sort((a, b) => a.childIndex - b.childIndex)
      .reduce<TDShape[]>((acc, shape) => [...acc, ...TLDR.flattenShape(data, shape)], [])
  }

  static getTopChildIndex = (data: TDSnapshot, pageId: string): number => {
    const shapes = TLDR.getShapes(data, pageId)
    return shapes.length === 0
      ? 1
      : shapes
          .filter((shape) => shape.parentId === pageId)
          .sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1
  }

  /* -------------------------------------------------- */
  /*                        Text                        */
  /* -------------------------------------------------- */

  static fixNewLines = /\r?\n|\r/g

  static normalizeText(text: string) {
    return text
      .replace(TLDR.fixNewLines, '\n')
      .split('\n')
      .map((x) => x || ' ')
      .join('\n')
  }

  /* -------------------------------------------------- */
  /*                     Assertions                     */
  /* -------------------------------------------------- */

  static assertShapeHasProperty<P extends keyof TDShape>(
    shape: TDShape,
    prop: P
  ): asserts shape is ShapesWithProp<P> {
    if (shape[prop] === undefined) {
      throw new Error()
    }
  }

  static warn(e: any) {
    if (isDev) {
      console.warn(e)
    }
  }
  static error(e: any) {
    if (isDev) {
      console.error(e)
    }
  }

  /* -------------------------------------------------- */
  /*                       Export                       */
  /* -------------------------------------------------- */

  static getSvgString(svg: SVGElement, scale = 1) {
    const clone = svg.cloneNode(true) as SVGGraphicsElement

    svg.setAttribute('width', +svg.getAttribute('width')! * scale + '')
    svg.setAttribute('height', +svg.getAttribute('height')! * scale + '')

    return new XMLSerializer()
      .serializeToString(clone)
      .replaceAll('&#10;      ', '')
      .replaceAll(/((\s|")[0-9]*\.[0-9]{2})([0-9]*)(\b|"|\))/g, '$1')
  }

  static getSvgAsDataUrl(svg: SVGElement, scale = 1) {
    const svgString = TLDR.getSvgString(svg, scale)

    const base64SVG = window.btoa(unescape(svgString))

    return `data:image/svg+xml;base64,${base64SVG}`
  }

  static async getImageForSvg(
    svg: SVGElement,
    type: Exclude<TDExportType, TDExportType.JSON> = TDExportType.PNG,
    opts = {} as Partial<{
      scale: number
      quality: number
    }>
  ) {
    const { scale = 2, quality = 1 } = opts

    const svgString = TLDR.getSvgString(svg, scale)

    if (!svgString) return

    const canvas = await new Promise<HTMLCanvasElement>((resolve) => {
      const image = new Image()

      image.crossOrigin = 'anonymous'

      const base64SVG = window.btoa(unescape(encodeURIComponent(svgString)))

      const dataUrl = `data:image/svg+xml;base64,${base64SVG}`

      image.onload = () => {
        const canvas = document.createElement('canvas') as HTMLCanvasElement
        const context = canvas.getContext('2d')!

        const imageWidth = image.width
        const imageHeight = image.height

        canvas.width = imageWidth
        canvas.height = imageHeight
        context.drawImage(image, 0, 0, imageWidth, imageHeight)

        URL.revokeObjectURL(dataUrl)

        resolve(canvas)
      }

      image.onerror = () => {
        console.warn('Could not convert that SVG to an image.')
      }

      image.src = dataUrl
    })

    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob!), 'image/' + type, quality)
    )

    return blob
  }
}
