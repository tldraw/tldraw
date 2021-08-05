import { TLBinding, TLBounds, TLTransformInfo, Vec, Utils } from '@tldraw/core'
import { getShapeUtils, ShapeStyles, TLDrawShape, TLDrawShapeUtil } from '../shape'
import { Data } from './state-types'

export class TLDR {
  static getShapeUtils<T extends TLDrawShape>(shape: T): TLDrawShapeUtil<T> {
    return getShapeUtils(shape)
  }

  static getSelectedShapes(data: Data) {
    return data.pageState.selectedIds.map(id => data.page.shapes[id])
  }

  static screenToWorld(data: Data, point: number[]) {
    const { camera } = data.pageState
    return Vec.sub(Vec.div(point, camera.zoom), camera.point)
  }

  static getViewport(data: Data): TLBounds {
    const [minX, minY] = this.screenToWorld(data, [0, 0])
    const [maxX, maxY] = this.screenToWorld(data, [window.innerWidth, window.innerHeight])

    return {
      minX,
      minY,
      maxX,
      maxY,
      height: maxX - minX,
      width: maxY - minY,
    }
  }

  static getCameraZoom(zoom: number) {
    return Utils.clamp(zoom, 0.1, 5)
  }

  static getCurrentCamera(data: Data) {
    return data.pageState.camera
  }

  static getPage(data: Data) {
    return data.page
  }

  static getPageState(data: Data) {
    return data.pageState
  }

  static getSelectedIds(data: Data) {
    return data.pageState.selectedIds
  }

  static getShapes(data: Data) {
    return Object.values(data.page.shapes)
  }

  static getCamera(data: Data) {
    return data.pageState.camera
  }

  static getShape<T extends TLDrawShape = TLDrawShape>(data: Data, shapeId: string): T {
    return data.page.shapes[shapeId] as T
  }

  static getBounds<T extends TLDrawShape>(shape: T) {
    return getShapeUtils(shape).getBounds(shape)
  }

  static getRotatedBounds<T extends TLDrawShape>(shape: T) {
    return getShapeUtils(shape).getRotatedBounds(shape)
  }

  static getSelectedBounds(data: Data): TLBounds {
    return Utils.getCommonBounds(
      this.getSelectedShapes(data).map(shape => getShapeUtils(shape).getBounds(shape))
    )
  }

  static getParentId(data: Data, id: string) {
    const shape = data.page.shapes[id]
    return shape.parentId
  }

  static getPointedId(data: Data, id: string): string {
    const shape = data.page.shapes[id]
    if (!shape) return id

    return shape.parentId === data.pageState.currentParentId || shape.parentId === data.page.id
      ? id
      : this.getPointedId(data, shape.parentId)
  }

  static getDrilledPointedId(data: Data, id: string): string {
    const shape = data.page.shapes[id]
    const { currentParentId, pointedId } = data.pageState

    return shape.parentId === data.page.id ||
      shape.parentId === pointedId ||
      shape.parentId === currentParentId
      ? id
      : this.getDrilledPointedId(data, shape.parentId)
  }

  static getTopParentId(data: Data, id: string): string {
    const shape = data.page.shapes[id]

    if (shape.parentId === shape.id) {
      throw Error(`Shape has the same id as its parent! ${shape.id}`)
    }

    return shape.parentId === data.page.id || shape.parentId === data.pageState.currentParentId
      ? id
      : this.getTopParentId(data, shape.parentId)
  }

  // Get an array of a shape id and its descendant shapes' ids
  static getDocumentBranch(data: Data, id: string): string[] {
    const shape = data.page.shapes[id]

    if (shape.children === undefined) return [id]

    return [id, ...shape.children.flatMap(childId => this.getDocumentBranch(data, childId))]
  }

  // Get a deep array of unproxied shapes and their descendants
  static getSelectedBranchSnapshot<K>(
    data: Data,
    fn: (shape: TLDrawShape) => K
  ): ({ id: string } & K)[]
  static getSelectedBranchSnapshot(data: Data): TLDrawShape[]
  static getSelectedBranchSnapshot<K>(
    data: Data,
    fn?: (shape: TLDrawShape) => K
  ): (TLDrawShape | K)[] {
    const page = this.getPage(data)

    const copies = this.getSelectedIds(data)
      .flatMap(id => this.getDocumentBranch(data, id).map(id => page.shapes[id]))
      .filter(shape => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map(shape => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // Get a shallow array of unproxied shapes
  static getSelectedShapeSnapshot(data: Data): TLDrawShape[]
  static getSelectedShapeSnapshot<K>(
    data: Data,
    fn?: (shape: TLDrawShape) => K
  ): ({ id: string } & K)[]
  static getSelectedShapeSnapshot<K>(
    data: Data,
    fn?: (shape: TLDrawShape) => K
  ): (TLDrawShape | K)[] {
    const copies = this.getSelectedShapes(data)
      .filter(shape => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map(shape => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // For a given array of shape ids, an array of all other shapes that may be affected by a mutation to it.
  // Use this to decide which shapes to clone as before / after for a command.
  static getAllEffectedShapeIds(data: Data, ids: string[]): string[] {
    const visited = new Set(ids)

    ids.forEach(id => {
      const shape = data.page.shapes[id]

      // Add descendant shapes
      function collectDescendants(shape: TLDrawShape): void {
        if (shape.children === undefined) return
        shape.children
          .filter(childId => !visited.has(childId))
          .forEach(childId => {
            visited.add(childId)
            collectDescendants(data.page.shapes[childId])
          })
      }

      collectDescendants(shape)

      // Add asecendant shapes
      function collectAscendants(shape: TLDrawShape): void {
        const parentId = shape.parentId
        if (parentId === data.page.id) return
        if (visited.has(parentId)) return
        visited.add(parentId)
        collectAscendants(data.page.shapes[parentId])
      }

      collectAscendants(shape)

      // Add bindings that are to or from any of the visited shapes (this does not have to be recursive)
      visited.forEach(id => {
        Object.values(data.page.bindings)
          .filter(binding => binding.fromId === id || binding.toId === id)
          .forEach(binding => visited.add(binding.fromId === id ? binding.toId : binding.fromId))
      })
    })

    // Return the unique array of visited shapes
    return Array.from(visited.values())
  }

  static recursivelyUpdateChildren<T extends TLDrawShape>(
    data: Data,
    id: string,
    beforeShapes: Record<string, Partial<TLDrawShape>> = {},
    afterShapes: Record<string, Partial<TLDrawShape>> = {}
  ): Data {
    const shape = data.page.shapes[id] as T

    if (shape.children !== undefined) {
      const deltas = this.getShapeUtils(shape).updateChildren(
        shape,
        shape.children.map(childId => data.page.shapes[childId])
      )

      if (deltas) {
        return deltas.reduce<Data>((cData, delta) => {
          const deltaShape = cData.page.shapes[delta.id!]

          if (!beforeShapes[deltaShape.id]) {
            beforeShapes[deltaShape.id] = deltaShape
          }
          cData.page.shapes[deltaShape.id] = this.getShapeUtils(deltaShape).mutate(
            deltaShape,
            delta
          )
          afterShapes[deltaShape.id] = cData.page.shapes[deltaShape.id]

          if (deltaShape.children !== undefined) {
            this.recursivelyUpdateChildren(cData, deltaShape.id, beforeShapes, afterShapes)
          }

          return cData
        }, data)
      }
    }

    return data
  }

  static recursivelyUpdateParents<T extends TLDrawShape>(
    data: Data,
    id: string,
    beforeShapes: Record<string, Partial<TLDrawShape>> = {},
    afterShapes: Record<string, Partial<TLDrawShape>> = {}
  ): Data {
    const shape = data.page.shapes[id] as T

    if (shape.parentId !== data.page.id) {
      const parent = data.page.shapes[shape.parentId] as T

      const delta = this.getShapeUtils(shape).onChildrenChange(
        parent,
        parent.children!.map(childId => data.page.shapes[childId])
      )

      if (delta) {
        if (!beforeShapes[parent.id]) {
          beforeShapes[parent.id] = parent
        }
        data.page.shapes[parent.id] = this.getShapeUtils(parent).mutate(parent, delta)
        afterShapes[parent.id] = data.page.shapes[parent.id]
      }

      if (parent.parentId !== data.page.id) {
        return this.recursivelyUpdateParents(data, parent.parentId, beforeShapes, afterShapes)
      }
    }

    return data
  }

  static updateBindings(
    data: Data,
    id: string,
    beforeShapes: Record<string, Partial<TLDrawShape>> = {},
    afterShapes: Record<string, Partial<TLDrawShape>> = {}
  ): Data {
    return Object.values(data.page.bindings)
      .filter(binding => binding.fromId === id || binding.toId === id)
      .reduce((cData, binding) => {
        if (!beforeShapes[binding.id]) {
          beforeShapes[binding.fromId] = Utils.deepClone(cData.page.shapes[binding.fromId])
        }

        if (!beforeShapes[binding.toId]) {
          beforeShapes[binding.toId] = Utils.deepClone(cData.page.shapes[binding.toId])
        }

        this.onBindingChange(
          cData,
          cData.page.shapes[binding.fromId],
          binding,
          cData.page.shapes[binding.toId]
        )

        afterShapes[binding.fromId] = Utils.deepClone(cData.page.shapes[binding.fromId])
        afterShapes[binding.toId] = Utils.deepClone(cData.page.shapes[binding.toId])

        return cData
      }, data)
  }

  static getChildIndexAbove(data: Data, id: string): number {
    const page = this.getPage(data)

    const shape = page.shapes[id]

    const siblings = Object.values(page.shapes)
      .filter(({ parentId }) => parentId === shape.parentId)
      .sort((a, b) => a.childIndex - b.childIndex)

    const index = siblings.indexOf(shape)

    const nextSibling = siblings[index + 1]

    if (!nextSibling) return shape.childIndex + 1

    return (shape.childIndex + nextSibling.childIndex) / 2
  }

  /* -------------------------------------------------- */
  /*                      Mutations                     */
  /* -------------------------------------------------- */

  static setSelectedIds(data: Data, ids: string[]) {
    data.pageState.selectedIds = ids
  }

  static deselectAll(data: Data) {
    this.setSelectedIds(data, [])
  }

  static mutateShapes(
    data: Data,
    ids: string[],
    fn: (shape: TLDrawShape, i: number) => Partial<TLDrawShape>
  ): {
    before: Record<string, Partial<TLDrawShape>>
    after: Record<string, Partial<TLDrawShape>>
    data: Data
  } {
    const beforeShapes: Record<string, Partial<TLDrawShape>> = {}
    const afterShapes: Record<string, Partial<TLDrawShape>> = {}

    ids.forEach((id, i) => {
      const shape = data.page.shapes[id]
      const change = fn(shape, i)
      beforeShapes[id] = Object.fromEntries(
        Object.keys(change).map(key => [key, shape[key as keyof TLDrawShape]])
      ) as Partial<TLDrawShape>
      afterShapes[id] = change
      data.page.shapes[id] = this.getShapeUtils(shape).mutate(
        shape as TLDrawShape,
        change as Partial<TLDrawShape>
      )
    })

    const dataWithChildrenChanges = ids.reduce<Data>((cData, id) => {
      return this.recursivelyUpdateChildren(cData, id, beforeShapes, afterShapes)
    }, data)

    const dataWithParentChanges = ids.reduce<Data>((cData, id) => {
      return this.recursivelyUpdateParents(cData, id, beforeShapes, afterShapes)
    }, dataWithChildrenChanges)

    const dataWithBindingChanges = ids.reduce<Data>((cData, id) => {
      return this.updateBindings(cData, id, beforeShapes, afterShapes)
    }, dataWithParentChanges)

    return {
      before: beforeShapes,
      after: afterShapes,
      data: dataWithBindingChanges,
    }
  }

  static createShapes(data: Data, shapes: TLDrawShape[]): void {
    const page = this.getPage(data)
    const shapeIds = shapes.map(shape => shape.id)

    // Update selected ids
    this.setSelectedIds(data, shapeIds)

    // Restore deleted shapes
    shapes.forEach(shape => {
      const newShape = { ...shape }
      page.shapes[shape.id] = newShape
    })

    // Update parents
    shapes.forEach(shape => {
      if (shape.parentId === data.page.id) return

      const parent = page.shapes[shape.parentId]

      this.mutate(data, parent, {
        children: parent.children!.includes(shape.id)
          ? parent.children
          : [...parent.children!, shape.id],
      })
    })
  }

  static onSessionComplete<T extends TLDrawShape>(data: Data, shape: T) {
    const delta = getShapeUtils(shape).onSessionComplete(shape)
    if (!delta) return shape
    return this.mutate(data, shape, delta)
  }

  static onChildrenChange<T extends TLDrawShape>(data: Data, shape: T) {
    const delta = getShapeUtils(shape).onChildrenChange(
      shape,
      shape.children!.map(id => data.page.shapes[id])
    )
    if (!delta) return shape
    return this.mutate(data, shape, delta)
  }

  static onBindingChange<T extends TLDrawShape>(
    data: Data,
    shape: T,
    binding: TLBinding,
    otherShape: TLDrawShape
  ) {
    const delta = getShapeUtils(shape).onBindingChange(
      shape,
      binding,
      otherShape,
      getShapeUtils(otherShape).getBounds(otherShape)
    )
    if (!delta) return shape
    return this.mutate(data, shape, delta)
  }

  static transform<T extends TLDrawShape>(
    data: Data,
    shape: T,
    bounds: TLBounds,
    info: TLTransformInfo<T>
  ) {
    return this.mutate(data, shape, getShapeUtils(shape).transform(shape, bounds, info))
  }

  static transformSingle<T extends TLDrawShape>(
    data: Data,
    shape: T,
    bounds: TLBounds,
    info: TLTransformInfo<T>
  ) {
    return this.mutate(data, shape, getShapeUtils(shape).transformSingle(shape, bounds, info))
  }

  static mutate<T extends TLDrawShape>(data: Data, shape: T, props: Partial<T>) {
    let next = getShapeUtils(shape).mutate(shape, props)

    if ('children' in props) {
      next = this.onChildrenChange(data, next)
    }

    data.page.shapes[next.id] = next

    return next
  }

  /* -------------------------------------------------- */
  /*                       Parents                      */
  /* -------------------------------------------------- */

  static updateParents(data: Data, changedShapeIds: string[]): void {
    if (changedShapeIds.length === 0) return

    const { shapes } = this.getPage(data)

    const parentToUpdateIds = Array.from(
      new Set(changedShapeIds.map(id => shapes[id].parentId).values())
    ).filter(id => id !== data.page.id)

    for (const parentId of parentToUpdateIds) {
      const parent = shapes[parentId]

      if (!parent.children) {
        throw Error('A shape is parented to a shape without a children array.')
      }

      this.onChildrenChange(data, parent)
    }

    this.updateParents(data, parentToUpdateIds)
  }

  static getSelectedStyle(data: Data): ShapeStyles | false {
    const {
      page,
      pageState,
      appState: { currentStyle },
    } = data

    if (pageState.selectedIds.length === 0) {
      return currentStyle
    }

    const shapeStyles = data.pageState.selectedIds.map(id => page.shapes[id].style)

    const commonStyle: ShapeStyles = {} as ShapeStyles

    const overrides = new Set<string>([])

    for (const shapeStyle of shapeStyles) {
      ;(Object.keys(currentStyle) as (keyof ShapeStyles)[]).forEach(key => {
        if (overrides.has(key)) return
        if (commonStyle[key] === undefined) {
          // @ts-ignore
          commonStyle[key] = shapeStyle[key]
        } else {
          if (commonStyle[key] === shapeStyle[key]) return
          // @ts-ignore
          commonStyle[key] = currentStyle[key]
          overrides.add(key)
        }
      })
    }

    return commonStyle
  }

  /* -------------------------------------------------- */
  /*                      Bindings                      */
  /* -------------------------------------------------- */

  static getBinding(data: Data, id: string): TLBinding {
    return this.getPage(data).bindings[id]
  }

  static getBindings(data: Data): TLBinding[] {
    const page = this.getPage(data)
    return Object.values(page.bindings)
  }

  static getBindingsWithShapeIds(data: Data, ids: string[]): TLBinding[] {
    return Array.from(
      new Set(
        this.getBindings(data).filter(binding => {
          return ids.includes(binding.toId) || ids.includes(binding.fromId)
        })
      ).values()
    )
  }

  static createBindings(data: Data, bindings: TLBinding[]): void {
    const page = this.getPage(data)
    bindings.forEach(binding => (page.bindings[binding.id] = binding))
  }

  static deleteBindings(data: Data, ids: string[]): void {
    if (ids.length === 0) return

    const page = this.getPage(data)

    ids.forEach(id => delete page.bindings[id])
  }

  // static updateBindings(data: Data, changedShapeIds: string[]): void {
  //   if (changedShapeIds.length === 0) return

  //   // First gather all bindings that are directly affected by the change
  //   const firstPassBindings = this.getBindingsWithShapeIds(data, changedShapeIds)

  //   // Gather all shapes that will be effected by the binding changes
  //   const effectedShapeIds = Array.from(
  //     new Set(firstPassBindings.flatMap((binding) => [binding.toId, binding.fromId])).values(),
  //   )

  //   // Now get all bindings that are affected by those shapes
  //   const bindingsToUpdate = this.getBindingsWithShapeIds(data, effectedShapeIds)

  //   // Populate a map of { [shapeId]: BindingsThatWillEffectTheShape[] }
  //   // Note that this will include both to and from bindings, and so will
  //   // likely include ids other than the changedShapeIds provided.

  //   const shapeIdToBindingsMap = new Map<string, TLBinding[]>()

  //   bindingsToUpdate.forEach((binding) => {
  //     const { toId, fromId } = binding

  //     for (const id of [toId, fromId]) {
  //       if (!shapeIdToBindingsMap.has(id)) {
  //         shapeIdToBindingsMap.set(id, [binding])
  //       } else {
  //         const bindings = shapeIdToBindingsMap.get(id)
  //         bindings.push(binding)
  //       }
  //     }
  //   })

  //   // Update each effected shape with the binding that effects it.
  //   Array.from(shapeIdToBindingsMap.entries()).forEach(([id, bindings]) => {
  //     const shape = this.getShape(data, id)
  //     bindings.forEach((binding) => {
  //       const otherShape =
  //         binding.toId === id
  //           ? this.getShape(data, binding.fromId)
  //           : this.getShape(data, binding.toId)

  //       this.onBindingChange(data, shape, binding, otherShape)
  //     })
  //   })
  // }
}
