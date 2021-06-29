import { clamp, deepClone, getCommonBounds, setToArray } from './utils'
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
} from 'types'
import { AssertionError } from 'assert'

export default class ProjectUtils {
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
   * Get the current selected shapes as an array.
   * @param data
   */
  static getSelectedShapes(data: Data): Shape[] {
    const page = this.getPage(data)
    const ids = setToArray(this.getSelectedIds(data))
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

    if (!nextSibling) {
      return shape.childIndex + 1
    }

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

  static getSelectedIds(data: Data): Set<string> {
    return data.pageStates[data.currentPageId].selectedIds
  }

  static setSelectedIds(data: Data, ids: string[]): Set<string> {
    data.pageStates[data.currentPageId].selectedIds = new Set(ids)
    return data.pageStates[data.currentPageId].selectedIds
  }

  static getTopParentId(data: Data, id: string): string {
    const shape = this.getPage(data).shapes[id]
    return shape.parentId === data.currentPageId ||
      shape.parentId === data.currentParentId
      ? id
      : this.getTopParentId(data, shape.parentId)
  }

  /* ----------------- Shapes Related ----------------- */

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
      .map((shape) => deepClone(shape))

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
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
}
