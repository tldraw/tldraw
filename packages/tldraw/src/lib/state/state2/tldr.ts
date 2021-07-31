import { TLBinding, TLBounds, TLTransformInfo, Vec, Utils } from '@tldraw/core'
import { getShapeUtils, TLDrawShape, TLDrawShapeUtil } from '../../shape'
import { Data } from './state-types'

export class TLDR {
  static getShapeUtils<T extends TLDrawShape>(shape: T): TLDrawShapeUtil<T> {
    return getShapeUtils(shape)
  }

  static getSelectedShapes(data: Data) {
    return data.pageState.selectedIds.map((id) => data.page.shapes[id])
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
      this.getSelectedShapes(data).map((shape) => getShapeUtils(shape).getBounds(shape)),
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

    return [id, ...shape.children.flatMap((childId) => this.getDocumentBranch(data, childId))]
  }

  // Get a deep array of unproxied shapes and their descendants
  static getSelectedBranchSnapshot<K>(
    data: Data,
    fn: (shape: TLDrawShape) => K,
  ): ({ id: string } & K)[]
  static getSelectedBranchSnapshot(data: Data): TLDrawShape[]
  static getSelectedBranchSnapshot<K>(
    data: Data,
    fn?: (shape: TLDrawShape) => K,
  ): (TLDrawShape | K)[] {
    const page = this.getPage(data)

    const copies = this.getSelectedIds(data)
      .flatMap((id) => this.getDocumentBranch(data, id).map((id) => page.shapes[id]))
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // Get a shallow array of unproxied shapes
  static getSelectedShapeSnapshot(data: Data): TLDrawShape[]
  static getSelectedShapeSnapshot<K>(
    data: Data,
    fn?: (shape: TLDrawShape) => K,
  ): ({ id: string } & K)[]
  static getSelectedShapeSnapshot<K>(
    data: Data,
    fn?: (shape: TLDrawShape) => K,
  ): (TLDrawShape | K)[] {
    const copies = this.getSelectedShapes(data)
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
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

  static mutateShapes<T extends TLDrawShape = TLDrawShape>(
    data: Data,
    ids: string[],
    fn: (shape: T) => Partial<T>,
  ): Record<string, TLDrawShape> {
    let shapes = {
      ...data.page.shapes,
      ...Object.fromEntries(
        ids.map((id) => {
          const shape = data.page.shapes[id] as T
          return [id, this.getShapeUtils(shape).mutate(shape, fn(shape))]
        }),
      ),
    }

    const changedParentIds = new Set<string>()

    // Next, update the parents
    const updateParents = (
      shapes: Record<string, TLDrawShape>,
      changedShapeIds: string[],
    ): Record<string, TLDrawShape> => {
      if (changedShapeIds.length === 0) return shapes

      const parentToUpdateIds = Array.from(
        new Set(changedShapeIds.map((id) => shapes[id].parentId).values()),
      ).filter((id) => id !== data.page.id)

      parentToUpdateIds
        .map((id) => data.page.shapes[id])
        .forEach((parent) => {
          if (!parent.children) {
            throw Error('A shape is parented to a shape without a children array.')
          }

          const delta = this.getShapeUtils(parent).onChildrenChange(
            parent,
            parent.children.map((id) => data.page.shapes[id]),
          )

          if (delta) {
            changedParentIds.add(parent.id)
            shapes[parent.id] = this.getShapeUtils(parent).mutate(parent, delta)
          }
        })

      return updateParents(shapes, parentToUpdateIds)
    }

    shapes = updateParents(shapes, ids)

    const finalChangedShapeIds = [...ids, ...Array.from(changedParentIds.values())]

    // Update the bindings
    function updateBindings(shapes: Record<string, TLDrawShape>, changedShapeIds: string[]) {
      return shapes
    }

    shapes = updateBindings(shapes, finalChangedShapeIds)

    return shapes
  }

  static createShapes(data: Data, shapes: TLDrawShape[]): void {
    const page = this.getPage(data)
    const shapeIds = shapes.map((shape) => shape.id)

    // Update selected ids
    this.setSelectedIds(data, shapeIds)

    // Restore deleted shapes
    shapes.forEach((shape) => {
      const newShape = { ...shape }
      page.shapes[shape.id] = newShape
    })

    // Update parents
    shapes.forEach((shape) => {
      if (shape.parentId === data.page.id) return

      const parent = page.shapes[shape.parentId]

      this.mutate(data, parent, {
        children: parent.children.includes(shape.id)
          ? parent.children
          : [...parent.children, shape.id],
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
      shape.children.map((id) => data.page.shapes[id]),
    )
    if (!delta) return shape
    return this.mutate(data, shape, delta)
  }

  static onBindingChange<T extends TLDrawShape>(
    data: Data,
    shape: T,
    binding: TLBinding,
    otherShape: TLDrawShape,
  ) {
    const delta = getShapeUtils(shape).onBindingChange(
      shape,
      binding,
      otherShape,
      getShapeUtils(otherShape).getBounds(otherShape),
    )
    if (!delta) return shape
    return this.mutate(data, shape, delta)
  }

  static transform<T extends TLDrawShape>(
    data: Data,
    shape: T,
    bounds: TLBounds,
    info: TLTransformInfo<T>,
  ) {
    return this.mutate(data, shape, getShapeUtils(shape).transform(shape, bounds, info))
  }

  static transformSingle<T extends TLDrawShape>(
    data: Data,
    shape: T,
    bounds: TLBounds,
    info: TLTransformInfo<T>,
  ) {
    return this.mutate(data, shape, getShapeUtils(shape).transformSingle(shape, bounds, info))
  }

  static mutate<T extends TLDrawShape>(data: Data, shape: T, props: Partial<T>) {
    let next = getShapeUtils(shape).mutate(shape, props)

    if ('children' in props) {
      next = this.onChildrenChange(data, next)
    }

    this.updateBindings(data, [next.id])

    this.updateParents(data, [next.id])

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
      new Set(changedShapeIds.map((id) => shapes[id].parentId).values()),
    ).filter((id) => id !== data.page.id)

    for (const parentId of parentToUpdateIds) {
      const parent = shapes[parentId]

      if (!parent.children) {
        throw Error('A shape is parented to a shape without a children array.')
      }

      this.onChildrenChange(data, parent)
    }

    this.updateParents(data, parentToUpdateIds)
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
        this.getBindings(data).filter((binding) => {
          return ids.includes(binding.toId) || ids.includes(binding.fromId)
        }),
      ).values(),
    )
  }

  static createBindings(data: Data, bindings: TLBinding[]): void {
    const page = this.getPage(data)
    bindings.forEach((binding) => (page.bindings[binding.id] = binding))
  }

  static deleteBindings(data: Data, ids: string[]): void {
    if (ids.length === 0) return

    const page = this.getPage(data)

    ids.forEach((id) => delete page.bindings[id])
  }

  static updateBindings(data: Data, changedShapeIds: string[]): void {
    if (changedShapeIds.length === 0) return

    // First gather all bindings that are directly affected by the change
    const firstPassBindings = this.getBindingsWithShapeIds(data, changedShapeIds)

    // Gather all shapes that will be effected by the binding changes
    const effectedShapeIds = Array.from(
      new Set(firstPassBindings.flatMap((binding) => [binding.toId, binding.fromId])).values(),
    )

    // Now get all bindings that are affected by those shapes
    const bindingsToUpdate = this.getBindingsWithShapeIds(data, effectedShapeIds)

    // Populate a map of { [shapeId]: BindingsThatWillEffectTheShape[] }
    // Note that this will include both to and from bindings, and so will
    // likely include ids other than the changedShapeIds provided.

    const shapeIdToBindingsMap = new Map<string, TLBinding[]>()

    bindingsToUpdate.forEach((binding) => {
      const { toId, fromId } = binding

      for (const id of [toId, fromId]) {
        if (!shapeIdToBindingsMap.has(id)) {
          shapeIdToBindingsMap.set(id, [binding])
        } else {
          const bindings = shapeIdToBindingsMap.get(id)
          bindings.push(binding)
        }
      }
    })

    // Update each effected shape with the binding that effects it.
    Array.from(shapeIdToBindingsMap.entries()).forEach(([id, bindings]) => {
      const shape = this.getShape(data, id)
      bindings.forEach((binding) => {
        const otherShape =
          binding.toId === id
            ? this.getShape(data, binding.fromId)
            : this.getShape(data, binding.toId)

        this.onBindingChange(data, shape, binding, otherShape)
      })
    })
  }
}
