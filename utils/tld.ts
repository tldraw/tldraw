import { clamp, deepClone, getCommonBounds } from 'utils'
import { getShapeUtils } from 'state/shape-utils'
import vec from './vec'
import {
  Data,
  Bounds,
  Shape,
  GroupShape,
  ShapeType,
  CodeFile,
  Page,
  PageState,
  ShapeUtility,
  ParentShape,
  ShapeTreeNode,
  ShapeByType,
  ShapesWithProp,
  ShapeBinding,
} from 'types'
import { AssertionError } from 'assert'
import { lerp } from './utils'

export default class StateUtils {
  static getCameraZoom(zoom: number): number {
    return clamp(zoom, 0.1, 5)
  }

  static screenToWorld(point: number[], data: Data): number[] {
    const camera = this.getCurrentCamera(data)
    return vec.sub(vec.div(point, camera.zoom), camera.point)
  }

  static getViewport(data: Data): Bounds {
    const [minX, minY] = this.screenToWorld([0, 0], data)
    const [maxX, maxY] = this.screenToWorld(
      [window.innerWidth, window.innerHeight],
      data
    )

    return {
      minX,
      minY,
      maxX,
      maxY,
      height: maxX - minX,
      width: maxY - minY,
    }
  }

  static getCurrentCamera(data: Data): {
    point: number[]
    zoom: number
  } {
    return data.pageStates[data.currentPageId].camera
  }

  /**
   * Get a shape from the project.
   * @param data
   * @param shapeId
   */
  static getShape(data: Data, shapeId: string): Shape {
    return data.document.pages[data.currentPageId].shapes[shapeId]
  }

  /**
   * Get the current page.
   * @param data
   */
  static getPage(data: Data): Page {
    return data.document.pages[data.currentPageId]
  }

  /**
   * Get the current page's page state.
   * @param data
   */
  static getPageState(data: Data): PageState {
    return data.pageStates[data.currentPageId]
  }

  /**
   * Get the current page's code file.
   * @param data
   * @param fileId
   */
  static getCurrentCode(data: Data, fileId: string): CodeFile {
    return data.document.code[fileId]
  }

  /**
   * Get the current page's shapes as an array.
   * @param data
   */
  static getShapes(data: Data): Shape[] {
    const page = this.getPage(data)
    return Object.values(page.shapes)
  }

  /**
   * Add the shapes to the current page.
   *
   * ### Example
   *
   *```ts
   * tld.createShape(data, [shape1])
   * tld.createShape(data, [shape1, shape2, shape3])
   *```
   */
  static createShapes(data: Data, shapes: Shape[]): void {
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
      if (shape.parentId === data.currentPageId) return

      const parent = page.shapes[shape.parentId]

      getShapeUtils(parent)
        .setProperty(
          parent,
          'children',
          parent.children.includes(shape.id)
            ? parent.children
            : [...parent.children, shape.id]
        )
        .onChildrenChange(
          parent,
          parent.children.map((id) => page.shapes[id])
        )
    })
  }

  /**
   * Delete the shapes from the current page.
   *
   * ### Example
   *
   *```ts
   * tld.deleteShape(data, [shape1])
   * tld.deleteShape(data, [shape1, shape1, shape1])
   *```
   */
  static deleteShapes(
    data: Data,
    shapeIds: string[] | Shape[],
    shapesDeleted: Shape[] = [],
    bindingsDeleted: ShapeBinding[] = []
  ): { shapes: Shape[]; bindings: ShapeBinding[] } {
    const ids =
      typeof shapeIds[0] === 'string'
        ? (shapeIds as string[])
        : (shapeIds as Shape[]).map((shape) => shape.id)

    const parentsToDelete: string[] = []

    const page = this.getPage(data)

    const parentIds = new Set(ids.map((id) => page.shapes[id].parentId))

    // Delete bindings that effect the current ids
    const bindingsToDelete = this.getBindingsWithShapeIds(data, ids)
    bindingsDeleted.push(...bindingsToDelete.map(deepClone))
    this.deleteBindings(
      data,
      bindingsToDelete.map((b) => b.id)
    )

    // Delete shapes
    const shapesToDelete = ids.map((id) => page.shapes[id])
    shapesDeleted.push(...shapesToDelete.map(deepClone))
    shapesToDelete.forEach((shape) => delete page.shapes[shape.id])

    // Update parents
    parentIds.forEach((id) => {
      const parent = page.shapes[id]

      // The parent was either deleted or a is a page.
      if (!parent) return

      const utils = getShapeUtils(parent)

      // Remove deleted ids from the parent's children and update the parent
      utils
        .setProperty(
          parent,
          'children',
          parent.children.filter((childId) => !ids.includes(childId))
        )
        .onChildrenChange(
          parent,
          parent.children.map((id) => page.shapes[id])
        )

      if (utils.shouldDelete(parent)) {
        // If the parent decides it should delete, then we need to reparent
        // the parent's remaining children to the parent's parent, and
        // assign them correct child indices, and then delete the parent on
        // the next recursive step.

        const nextIndex = this.getChildIndexAbove(data, parent.id)

        const len = parent.children.length

        // Reparent the children and assign them new child indices
        parent.children.forEach((childId, i) => {
          const child = this.getShape(data, childId)

          getShapeUtils(child)
            .setProperty(child, 'parentId', parent.parentId)
            .setProperty(
              child,
              'childIndex',
              lerp(parent.childIndex, nextIndex, i / len)
            )
        })

        if (parent.parentId !== page.id) {
          // If the parent is not a page, then we add the parent's children
          // to the parent's parent shape before emptying that array. If the
          // parent is a page, then we don't need to do this step.
          // TODO: Consider adding explicit children array to page shapes.
          const grandParent = page.shapes[parent.parentId]

          getShapeUtils(grandParent)
            .setProperty(grandParent, 'children', [...parent.children])
            .onChildrenChange(
              grandParent,
              grandParent.children.map((id) => page.shapes[id])
            )
        }

        // Empty the parent's children array and delete the parent on the next
        // iteration step.
        getShapeUtils(parent).setProperty(parent, 'children', [])
        parentsToDelete.push(parent.id)
      }
    })

    if (parentsToDelete.length > 0) {
      return this.deleteShapes(
        data,
        parentsToDelete,
        shapesDeleted,
        bindingsDeleted
      )
    }

    return {
      shapes: shapesDeleted,
      bindings: bindingsDeleted,
    }
  }

  /**
   * Get the current selected shapes as an array.
   * @param data
   */
  static getSelectedShapes(data: Data): Shape[] {
    const page = this.getPage(data)
    const ids = this.getSelectedIds(data)
    return ids.map((id) => page.shapes[id])
  }

  /**
   * Get a shape's parent.
   * @param data
   * @param id
   */
  static getParent(data: Data, id: string): Shape | Page {
    const page = this.getPage(data)
    const shape = page.shapes[id]

    return page.shapes[shape.parentId] || data.document.pages[shape.parentId]
  }

  /**
   * Get a shape's children.
   * @param data
   * @param id
   */
  static getChildren(data: Data, id: string): Shape[] {
    const page = this.getPage(data)
    return Object.values(page.shapes)
      .filter(({ parentId }) => parentId === id)
      .sort((a, b) => a.childIndex - b.childIndex)
  }

  /**
   * Get a shape's siblings.
   * @param data
   * @param id
   */
  static getSiblings(data: Data, id: string): Shape[] {
    const page = this.getPage(data)
    const shape = page.shapes[id]

    return Object.values(page.shapes)
      .filter(({ parentId }) => parentId === shape.parentId)
      .sort((a, b) => a.childIndex - b.childIndex)
  }

  /**
   * Get the next child index above a shape.
   * TODO: Make work for grouped shapes, make faster.
   * @param data
   * @param id
   */
  static getChildIndexAbove(data: Data, id: string): number {
    const page = this.getPage(data)

    const shape = page.shapes[id]

    const siblings = Object.values(page.shapes)
      .filter(({ parentId }) => parentId === shape.parentId)
      .sort((a, b) => a.childIndex - b.childIndex)

    const index = siblings.indexOf(shape)

    const nextSibling = siblings[index + 1]

    if (!nextSibling) return shape.childIndex + 1

    let nextIndex = (shape.childIndex + nextSibling.childIndex) / 2

    if (nextIndex === nextSibling.childIndex) {
      this.forceIntegerChildIndices(siblings)
      nextIndex = (shape.childIndex + nextSibling.childIndex) / 2
    }

    return nextIndex
  }

  /**
   * Get the next child index below a shape.
   * @param data
   * @param id
   * @param pageId
   */
  static getChildIndexBelow(data: Data, id: string): number {
    const page = this.getPage(data)

    const shape = page.shapes[id]

    const siblings = Object.values(page.shapes)
      .filter(({ parentId }) => parentId === shape.parentId)
      .sort((a, b) => a.childIndex - b.childIndex)

    const index = siblings.indexOf(shape)

    const prevSibling = siblings[index - 1]

    if (!prevSibling) {
      return shape.childIndex / 2
    }

    let nextIndex = (shape.childIndex + prevSibling.childIndex) / 2

    if (nextIndex === prevSibling.childIndex) {
      this.forceIntegerChildIndices(siblings)
      nextIndex = (shape.childIndex + prevSibling.childIndex) / 2
    }

    return (shape.childIndex + prevSibling.childIndex) / 2
  }

  static getBindableShapes(data: Data, shape: Shape): Shape[] {
    return this.getShapes(data).filter(
      (otherShape) => otherShape !== shape && getShapeUtils(otherShape).canBind
    )
  }

  /**
   * Assert whether a shape can have child shapes.
   * @param shape
   */
  static assertParentShape(shape: Shape): asserts shape is ParentShape {
    if (!('children' in shape)) {
      throw new AssertionError({
        message: `That shape was not a parent (it was a ${shape.type}).`,
      })
    }
  }

  /**
   * Assert whether a shape can have child shapes.
   * @param shape
   */
  static assertShapeType<T extends ShapeType>(
    shape: Shape,
    type: T
  ): asserts shape is ShapeByType<T> {
    if (shape.type !== type) {
      throw new AssertionError({
        message: `That shape was of that type (it was a ${shape.type}).`,
      })
    }
  }

  /**
   * Assert that a shape has a certain property.
   *
   * ### Example
   *
   *```ts
   * tld.assertShapeHasProperty(shape, 'handles')
   *```
   */

  static assertShapeHasProperty<P extends keyof Shape>(
    shape: Shape,
    prop: P
  ): asserts shape is ShapesWithProp<P> {
    if (shape[prop] === undefined) {
      throw new AssertionError()
    }
  }

  /**
   * Get the top child index for a shape. This is potentially provisional:
   * sorting all shapes on the page for each new created shape will become
   * slower as the page grows. High indices aren't a problem, so consider
   * tracking the highest index for the page when shapes are created / deleted.
   *
   * @param data
   * @param id
   */
  static getTopChildIndex(data: Data, parent: Shape | Page): number {
    const page = this.getPage(data)

    // If the parent is a shape, return either 1 (if no other shapes) or the
    // highest sorted child index + 1.
    if (parent.type === 'page') {
      const children = Object.values(parent.shapes)

      if (children.length === 0) return 1

      return (
        children.sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1
      )
    }

    // If the shape is a regular shape that can accept children, return either
    // 1 (if no other children) or the highest sorted child index + 1.
    this.assertParentShape(parent)

    if (parent.children.length === 0) return 1

    return (
      parent.children
        .map((id) => page.shapes[id])
        .sort((a, b) => b.childIndex - a.childIndex)[0].childIndex + 1
    )
  }

  /**
   * TODO: Make this recursive, so that it works for parented shapes.
   * Force all shapes on the page to have integer child indices.
   * @param shapes
   */
  static forceIntegerChildIndices(shapes: Shape[]): void {
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i]
      getShapeUtils(shape).setProperty(shape, 'childIndex', i + 1)
    }
  }

  /**
   * Update the zoom CSS variable.
   * @param zoom ;
   */
  static setZoomCSS(zoom: number): void {
    document.documentElement.style.setProperty('--camera-zoom', zoom.toString())
  }

  /* --------------------- Groups --------------------- */

  static getParentOffset(
    data: Data,
    shapeId: string,
    offset = [0, 0]
  ): number[] {
    const shape = this.getShape(data, shapeId)
    return shape.parentId === data.currentPageId
      ? offset
      : this.getParentOffset(data, shape.parentId, vec.add(offset, shape.point))
  }

  static getParentRotation(data: Data, shapeId: string, rotation = 0): number {
    const shape = this.getShape(data, shapeId)
    return shape.parentId === data.currentPageId
      ? rotation + shape.rotation
      : this.getParentRotation(data, shape.parentId, rotation + shape.rotation)
  }

  static getDocumentBranch(data: Data, id: string): string[] {
    const shape = this.getPage(data).shapes[id]

    if (shape.type !== ShapeType.Group) return [id]

    return [
      id,
      ...shape.children.flatMap((childId) =>
        this.getDocumentBranch(data, childId)
      ),
    ]
  }

  static getSelectedIds(data: Data): string[] {
    return data.pageStates[data.currentPageId].selectedIds
  }

  static setSelectedIds(data: Data, ids: string[]): string[] {
    data.pageStates[data.currentPageId].selectedIds = [...ids]
    return data.pageStates[data.currentPageId].selectedIds
  }

  static getTopParentId(data: Data, id: string): string {
    const shape = this.getPage(data).shapes[id]

    if (shape.parentId === shape.id) {
      console.error('Shape has the same id as its parent!', deepClone(shape))
      return shape.parentId
    }

    return shape.parentId === data.currentPageId ||
      shape.parentId === data.currentParentId
      ? id
      : this.getTopParentId(data, shape.parentId)
  }

  /* ----------------- Shapes Related ----------------- */

  /**
   * Get a deep-cloned
   * @param data
   * @param fn
   */
  static getSelectedBranchSnapshot<K>(
    data: Data,
    fn: <T extends Shape>(shape: T) => K
  ): ({ id: string } & K)[]
  static getSelectedBranchSnapshot(data: Data): Shape[]
  static getSelectedBranchSnapshot<
    K,
    F extends <T extends Shape>(shape: T) => K
  >(data: Data, fn?: F): (Shape | K)[] {
    const page = this.getPage(data)

    const copies = this.getSelectedIds(data)
      .flatMap((id) =>
        this.getDocumentBranch(data, id).map((id) => page.shapes[id])
      )
      .filter((shape) => !shape.isLocked)
      .map(deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  /**
   * Get a deep-cloned array of shapes
   * @param data
   */
  static getSelectedShapeSnapshot(data: Data): Shape[]
  static getSelectedShapeSnapshot<K>(
    data: Data,
    fn: <T extends Shape>(shape: T) => K
  ): ({ id: string } & K)[]
  static getSelectedShapeSnapshot<
    K,
    F extends <T extends Shape>(shape: T) => K
  >(data: Data, fn?: F): (Shape | K)[] {
    const copies = this.getSelectedShapes(data)
      .filter((shape) => !shape.isLocked)
      .map(deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  /**
   * Get an array of all unique parentIds among a set of shapes.
   * @param data
   * @param shapes
   */
  static getUniqueParentIds(data: Data, shapes: Shape[]): string[] {
    return Array.from(new Set(shapes.map((s) => s.parentId)).values()).filter(
      (id) => id !== data.currentPageId
    )
  }

  /**
   * Make an arbitrary change to shape.
   * @param data
   * @param ids
   * @param fn
   */
  static mutateShape<T extends Shape>(
    data: Data,
    id: string,
    fn: (shapeUtils: ShapeUtility<T>, shape: T) => void,
    updateParents = true
  ): T {
    const page = this.getPage(data)

    const shape = page.shapes[id] as T
    fn(getShapeUtils(shape) as ShapeUtility<T>, shape)

    if (updateParents) this.updateParents(data, [id])

    return shape
  }

  /**
   * Make an arbitrary change to a set of shapes.
   * @param data
   * @param ids
   * @param fn
   */
  static mutateShapes<T extends Shape>(
    data: Data,
    ids: string[],
    fn: (shape: T, shapeUtils: ShapeUtility<T>, index: number) => T | void,
    updateParents = true
  ): T[] {
    const page = this.getPage(data)

    const mutatedShapes = ids.map((id, i) => {
      const shape = page.shapes[id] as T

      // Define the new shape as either the (maybe new) shape returned by the
      // function or the mutated shape.
      page.shapes[id] =
        fn(shape, getShapeUtils(shape) as ShapeUtility<T>, i) || shape

      return page.shapes[id] as T
    })

    if (updateParents) this.updateParents(data, ids)

    return mutatedShapes
  }

  /**
   * Insert shapes into the current page.
   * @param data
   * @param shapes
   */
  static insertShapes(data: Data, shapes: Shape[]): void {
    const page = this.getPage(data)

    shapes.forEach((shape) => {
      page.shapes[shape.id] = shape

      // Does the shape have a parent?
      if (shape.parentId !== data.currentPageId) {
        // The parent shape
        const parent = page.shapes[shape.parentId]

        // If the parent shape doesn't exist, assign the shape as a child
        // of the page instead.
        if (parent === undefined) {
          getShapeUtils(shape).setProperty(
            shape,
            'childIndex',
            this.getTopChildIndex(data, parent)
          )
        } else {
          // Add the shape's id to the parent's children, then sort the
          // new array just to be sure.
          getShapeUtils(parent).setProperty(
            parent,
            'children',
            [...parent.children, shape.id]
              .map((id) => page.shapes[id])
              .sort((a, b) => a.childIndex - b.childIndex)
              .map((shape) => shape.id)
          )
        }
      }
    })

    // Update any new parents
    this.updateParents(
      data,
      shapes.map((shape) => shape.id)
    )
  }

  static getRotatedBounds(shape: Shape): Bounds {
    return getShapeUtils(shape).getRotatedBounds(shape)
  }

  static getShapeBounds(shape: Shape): Bounds {
    return getShapeUtils(shape).getBounds(shape)
  }

  static getSelectedBounds(data: Data): Bounds {
    return getCommonBounds(
      ...this.getSelectedShapes(data).map((shape) =>
        getShapeUtils(shape).getBounds(shape)
      )
    )
  }

  /**
   * Recursively update shape parents.
   * @param data
   * @param changedShapeIds
   */
  static updateParents(data: Data, changedShapeIds: string[]): void {
    if (changedShapeIds.length === 0) return

    const { shapes } = this.getPage(data)

    const parentToUpdateIds = Array.from(
      new Set(changedShapeIds.map((id) => shapes[id].parentId).values())
    ).filter((id) => id !== data.currentPageId)

    for (const parentId of parentToUpdateIds) {
      const parent = shapes[parentId] as GroupShape

      getShapeUtils(parent).onChildrenChange(
        parent,
        parent.children.map((id) => shapes[id])
      )

      shapes[parentId] = { ...parent }
    }

    this.updateParents(data, parentToUpdateIds)
  }

  /**
   * Populate the shape tree. This helper is recursive and only one call is needed.
   *
   * ### Example
   *
   *```ts
   * addDataToTree(data, selectedIds, allowHovers, branch, shape)
   *```
   */
  static addToShapeTree(
    data: Data,
    selectedIds: string[],
    branch: ShapeTreeNode[],
    shape: Shape
  ): void {
    const currentBinding = this.getBinding(data, data.editingBindingId)

    const node = {
      shape,
      children: [],
      isHovered: data.hoveredId === shape.id,
      isCurrentParent: data.currentParentId === shape.id,
      isEditing: data.editingId === shape.id,
      isBinding: currentBinding?.toId === shape.id,
      isDarkMode: data.settings.isDarkMode,
      isSelected: selectedIds.includes(shape.id),
    }

    branch.push(node)

    if (shape.children) {
      shape.children
        .map((id) => this.getShape(data, id))
        .sort((a, b) => a.childIndex - b.childIndex)
        .forEach((childShape) => {
          this.addToShapeTree(data, selectedIds, node.children, childShape)
        })
    }
  }

  /* -------------------------------------------------- */
  /*                      Bindings                      */
  /* -------------------------------------------------- */

  /**
   * Get a binding by its id.
   *
   * ### Example
   *
   *```ts
   * tld.getBinding(data, myBindingId)
   *```
   */
  static getBinding(data: Data, id: string): ShapeBinding {
    return this.getPage(data).bindings[id]
  }

  /**
   * Get the current page's bindings.
   *
   * ### Example
   *
   *```ts
   * tld.getBindings(data)
   *```
   */
  static getBindings(data: Data): ShapeBinding[] {
    const page = this.getPage(data)
    return Object.values(page.bindings)
  }

  /**
   * Create one or more bindings.
   *
   * ### Example
   *
   *```ts
   * tld.createBindings(data, myBindings)
   *```
   */
  static createBindings(data: Data, bindings: ShapeBinding[]): void {
    const page = this.getPage(data)
    bindings.forEach((binding) => (page.bindings[binding.id] = binding))
  }

  /**
   * Delete one or more bindings.
   *
   * ### Example
   *
   *```ts
   * tld.deleteBindings(data, myBindingIds)
   *```
   */
  static deleteBindings(data: Data, ids: string[]): void {
    if (ids.length === 0) return

    const page = this.getPage(data)

    ids.forEach((id) => delete page.bindings[id])
  }

  /**
   * Get a unique array of bindings that relate to the given ids.
   *
   * ### Example
   *
   *```ts
   * tld.getBindingsWithShapeIds(data, mySelectedIds)
   *```
   */
  static getBindingsWithShapeIds(data: Data, ids: string[]): ShapeBinding[] {
    return Array.from(
      new Set(
        this.getBindings(data).filter((binding) => {
          return ids.includes(binding.toId) || ids.includes(binding.fromId)
        })
      ).values()
    )
  }

  static updateBindings(data: Data, changedShapeIds: string[]): void {
    if (changedShapeIds.length === 0) return

    const bindingsToUpdate = this.getBindingsWithShapeIds(data, changedShapeIds)

    // Populate a map of { [shapeId]: BindingsThatWillEffectTheShape[] }
    // Note that this will include both to and from bindings, and so will
    // likely include ids other than the changedShapeIds provided.

    const shapeIdToBindingsMap = new Map<string, ShapeBinding[]>()

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

        const otherBounds = getShapeUtils(otherShape).getBounds(otherShape)

        getShapeUtils(shape).onBindingChange(
          shape,
          binding,
          otherShape,
          otherBounds
        )
      })
    })
  }
}
