import { TLBounds, TLTransformInfo, Vec, Utils, TLPageState } from '@tldraw/core'
import { getShapeUtils } from '~shape'
import type {
  Data,
  DeepPartial,
  ShapeStyles,
  ShapesWithProp,
  TLDrawShape,
  TLDrawShapeUtil,
  TLDrawBinding,
  TLDrawPage,
} from '~types'

export class TLDR {
  static getShapeUtils<T extends TLDrawShape>(shape: T | T['type']): TLDrawShapeUtil<T> {
    return getShapeUtils(typeof shape === 'string' ? ({ type: shape } as T) : shape)
  }

  static getSelectedShapes(data: Data) {
    const page = this.getPage(data)
    const selectedIds = this.getSelectedIds(data)
    return selectedIds.map((id) => page.shapes[id])
  }

  static screenToWorld(data: Data, point: number[]) {
    const camera = this.getCamera(data)
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

  static getPage(data: Data, pageId = data.appState.currentPageId): TLDrawPage {
    return data.document.pages[pageId]
  }

  static getPageState(data: Data, pageId = data.appState.currentPageId): TLPageState {
    return data.document.pageStates[pageId]
  }

  static getSelectedIds(data: Data, pageId = data.appState.currentPageId): string[] {
    return this.getPageState(data, pageId).selectedIds
  }

  static getShapes(data: Data, pageId = data.appState.currentPageId): TLDrawShape[] {
    return Object.values(this.getPage(data, pageId).shapes)
  }

  static getCamera(data: Data, pageId = data.appState.currentPageId): TLPageState['camera'] {
    return this.getPageState(data, pageId).camera
  }

  static getShape<T extends TLDrawShape = TLDrawShape>(
    data: Data,
    shapeId: string,
    pageId = data.appState.currentPageId
  ): T {
    return this.getPage(data, pageId).shapes[shapeId] as T
  }

  static getBounds<T extends TLDrawShape>(shape: T) {
    return getShapeUtils(shape).getBounds(shape)
  }

  static getRotatedBounds<T extends TLDrawShape>(shape: T) {
    return getShapeUtils(shape).getRotatedBounds(shape)
  }

  static getSelectedBounds(data: Data): TLBounds {
    return Utils.getCommonBounds(
      this.getSelectedShapes(data).map((shape) => getShapeUtils(shape).getBounds(shape))
    )
  }

  static getParentId(data: Data, id: string) {
    return this.getShape(data, id).parentId
  }

  static getPointedId(data: Data, id: string): string {
    const page = this.getPage(data)
    const pageState = this.getPageState(data)
    const shape = this.getShape(data, id)
    if (!shape) return id

    return shape.parentId === pageState.currentParentId || shape.parentId === page.id
      ? id
      : this.getPointedId(data, shape.parentId)
  }

  static getDrilledPointedId(data: Data, id: string): string {
    const shape = this.getShape(data, id)
    const { currentPageId } = data.appState
    const { currentParentId, pointedId } = this.getPageState(data)

    return shape.parentId === currentPageId ||
      shape.parentId === pointedId ||
      shape.parentId === currentParentId
      ? id
      : this.getDrilledPointedId(data, shape.parentId)
  }

  static getTopParentId(data: Data, id: string): string {
    const page = this.getPage(data)
    const pageState = this.getPageState(data)
    const shape = this.getShape(data, id)

    if (shape.parentId === shape.id) {
      throw Error(`Shape has the same id as its parent! ${shape.id}`)
    }

    return shape.parentId === page.id || shape.parentId === pageState.currentParentId
      ? id
      : this.getTopParentId(data, shape.parentId)
  }

  // Get an array of a shape id and its descendant shapes' ids
  static getDocumentBranch(data: Data, id: string): string[] {
    const shape = this.getShape(data, id)

    if (shape.children === undefined) return [id]

    return [id, ...shape.children.flatMap((childId) => this.getDocumentBranch(data, childId))]
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
    fn?: (shape: TLDrawShape) => K
  ): ({ id: string } & K)[]
  static getSelectedShapeSnapshot<K>(
    data: Data,
    fn?: (shape: TLDrawShape) => K
  ): (TLDrawShape | K)[] {
    const copies = this.getSelectedShapes(data)
      .filter((shape) => !shape.isLocked)
      .map(Utils.deepClone)

    if (fn !== undefined) {
      return copies.map((shape) => ({ id: shape.id, ...fn(shape) }))
    }

    return copies
  }

  // For a given array of shape ids, an array of all other shapes that may be affected by a mutation to it.
  // Use this to decide which shapes to clone as before / after for a command.
  static getAllEffectedShapeIds(data: Data, ids: string[]): string[] {
    const page = this.getPage(data)

    const visited = new Set(ids)

    ids.forEach((id) => {
      const shape = page.shapes[id]

      // Add descendant shapes
      function collectDescendants(shape: TLDrawShape): void {
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
      function collectAscendants(shape: TLDrawShape): void {
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

  static recursivelyUpdateChildren<T extends TLDrawShape>(
    data: Data,
    id: string,
    beforeShapes: Record<string, Partial<TLDrawShape>> = {},
    afterShapes: Record<string, Partial<TLDrawShape>> = {}
  ): Data {
    const page = this.getPage(data)
    const shape = page.shapes[id] as T

    if (shape.children !== undefined) {
      const deltas = this.getShapeUtils(shape).updateChildren(
        shape,
        shape.children.map((childId) => page.shapes[childId])
      )

      if (deltas) {
        return deltas.reduce<Data>((cData, delta) => {
          if (!delta.id) throw Error('Delta must include an id!')
          const cPage = this.getPage(cData)
          const deltaShape = this.getShape(cData, delta.id)

          if (!beforeShapes[delta.id]) {
            beforeShapes[delta.id] = deltaShape
          }
          cPage.shapes[delta.id] = this.getShapeUtils(deltaShape).mutate(deltaShape, delta)
          afterShapes[delta.id] = cPage.shapes[delta.id]

          if (deltaShape.children !== undefined) {
            this.recursivelyUpdateChildren(cData, delta.id, beforeShapes, afterShapes)
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
    const page = { ...this.getPage(data) }
    const shape = this.getShape<T>(data, id)

    if (page.id === 'doc') {
      throw Error('wtf')
    }

    if (shape.parentId !== page.id) {
      const parent = this.getShape(data, shape.parentId)

      if (!parent.children) throw Error('No children in parent!')

      const delta = this.getShapeUtils(parent).onChildrenChange(
        parent,
        parent.children.map((childId) => this.getShape(data, childId))
      )

      if (delta) {
        if (!beforeShapes[parent.id]) {
          beforeShapes[parent.id] = parent
        }
        page.shapes[parent.id] = this.getShapeUtils(parent).mutate(parent, delta)
        afterShapes[parent.id] = page.shapes[parent.id]
      }

      if (parent.parentId !== page.id) {
        return this.recursivelyUpdateParents(data, parent.parentId, beforeShapes, afterShapes)
      }
    }

    if (data.appState.currentPageId === 'doc') {
      console.error('WTF?')
    }

    return {
      ...data,
      document: {
        ...data.document,
        pages: {
          ...data.document.pages,
          [page.id]: page,
        },
      },
    }
  }

  static updateBindings(
    data: Data,
    id: string,
    beforeShapes: Record<string, Partial<TLDrawShape>> = {},
    afterShapes: Record<string, Partial<TLDrawShape>> = {}
  ): Data {
    const page = { ...this.getPage(data) }
    return Object.values(page.bindings)
      .filter((binding) => binding.fromId === id || binding.toId === id)
      .reduce((cData, binding) => {
        if (!beforeShapes[binding.id]) {
          beforeShapes[binding.fromId] = Utils.deepClone(this.getShape(cData, binding.fromId))
        }

        if (!beforeShapes[binding.toId]) {
          beforeShapes[binding.toId] = Utils.deepClone(this.getShape(cData, binding.toId))
        }

        this.onBindingChange(
          cData,
          this.getShape(cData, binding.fromId),
          binding,
          this.getShape(cData, binding.toId)
        )

        afterShapes[binding.fromId] = Utils.deepClone(this.getShape(cData, binding.fromId))
        afterShapes[binding.toId] = Utils.deepClone(this.getShape(cData, binding.toId))

        return cData
      }, data)
  }

  static getChildIndexAbove(data: Data, id: string): number {
    const page = this.getPage(data)

    const shape = page.shapes[id]

    let siblings: TLDrawShape[]

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

    return (shape.childIndex + nextSibling.childIndex) / 2
  }

  /* -------------------------------------------------- */
  /*                      Mutations                     */
  /* -------------------------------------------------- */

  static mutateShapes<T extends TLDrawShape>(
    data: Data,
    ids: string[],
    fn: (shape: T, i: number) => Partial<T>,
    pageId = data.appState.currentPageId
  ): {
    before: Record<string, Partial<T>>
    after: Record<string, Partial<T>>
    data: Data
  } {
    const page = { ...this.getPage(data, pageId) }
    const beforeShapes: Record<string, Partial<T>> = {}
    const afterShapes: Record<string, Partial<T>> = {}

    ids.forEach((id, i) => {
      const shape = this.getShape<T>(data, id, pageId)
      const change = fn(shape, i)
      beforeShapes[id] = Object.fromEntries(
        Object.keys(change).map((key) => [key, shape[key as keyof T]])
      ) as Partial<T>
      afterShapes[id] = change
      page.shapes[id] = this.getShapeUtils(shape).mutate(shape as T, change as Partial<T>)
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

  static createShapes(
    data: Data,
    shapes: TLDrawShape[],
    pageId = data.appState.currentPageId
  ): { before: DeepPartial<Data>; after: DeepPartial<Data> } {
    const before: DeepPartial<Data> = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              ...Object.fromEntries(
                shapes.flatMap((shape) => {
                  const results: [string, Partial<TLDrawShape> | undefined][] = [
                    [shape.id, undefined],
                  ]

                  // If the shape is a child of another shape, also save that shape
                  if (shape.parentId !== pageId) {
                    const parent = this.getShape(data, shape.parentId, pageId)
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

    const after: DeepPartial<Data> = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              shapes: {
                ...Object.fromEntries(
                  shapes.flatMap((shape) => {
                    const results: [string, Partial<TLDrawShape> | undefined][] = [
                      [shape.id, shape],
                    ]

                    // If the shape is a child of a different shape, update its parent
                    if (shape.parentId !== pageId) {
                      const parent = this.getShape(data, shape.parentId, pageId)
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
    data: Data,
    shapes: TLDrawShape[] | string[],
    pageId = data.appState.currentPageId
  ): { before: DeepPartial<Data>; after: DeepPartial<Data> } {
    const page = this.getPage(data, pageId)

    const shapeIds =
      typeof shapes[0] === 'string'
        ? (shapes as string[])
        : (shapes as TLDrawShape[]).map((shape) => shape.id)

    const before: DeepPartial<Data> = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              // These are the shapes that we're going to delete
              ...Object.fromEntries(
                shapeIds.flatMap((id) => {
                  const shape = page.shapes[id]
                  const results: [string, Partial<TLDrawShape> | undefined][] = [[shape.id, shape]]

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

    const after: DeepPartial<Data> = {
      document: {
        pages: {
          [pageId]: {
            shapes: {
              ...Object.fromEntries(
                shapeIds.flatMap((id) => {
                  const shape = page.shapes[id]
                  const results: [string, Partial<TLDrawShape> | undefined][] = [
                    [shape.id, undefined],
                  ]

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

  static onSessionComplete<T extends TLDrawShape>(data: Data, shape: T) {
    const delta = getShapeUtils(shape).onSessionComplete(shape)
    if (!delta) return shape
    return this.mutate(data, shape, delta)
  }

  static onChildrenChange<T extends TLDrawShape>(data: Data, shape: T) {
    if (!shape.children) return

    const delta = getShapeUtils(shape).onChildrenChange(
      shape,
      shape.children.map((id) => this.getShape(data, id))
    )
    if (!delta) return shape
    return this.mutate(data, shape, delta)
  }

  static onBindingChange<T extends TLDrawShape>(
    data: Data,
    shape: T,
    binding: TLDrawBinding,
    otherShape: TLDrawShape
  ) {
    const delta = getShapeUtils(shape).onBindingChange(
      shape,
      binding,
      otherShape,
      getShapeUtils(otherShape).getBounds(otherShape),
      getShapeUtils(otherShape).getCenter(otherShape)
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

    if (props.children) {
      next = this.onChildrenChange(data, next) || next
    }

    // data.page.shapes[next.id] = next

    return next
  }

  /* -------------------------------------------------- */
  /*                       Parents                      */
  /* -------------------------------------------------- */

  static updateParents(data: Data, changedShapeIds: string[]): void {
    const page = this.getPage(data)

    if (changedShapeIds.length === 0) return

    const { shapes } = this.getPage(data)

    const parentToUpdateIds = Array.from(
      new Set(changedShapeIds.map((id) => shapes[id].parentId).values())
    ).filter((id) => id !== page.id)

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
      appState: { currentStyle },
    } = data

    const page = this.getPage(data)
    const pageState = this.getPageState(data)

    if (pageState.selectedIds.length === 0) {
      return currentStyle
    }

    const shapeStyles = pageState.selectedIds.map((id) => page.shapes[id].style)

    const commonStyle = {} as ShapeStyles

    const overrides = new Set<string>([])

    for (const shapeStyle of shapeStyles) {
      const styles = Object.keys(currentStyle) as (keyof ShapeStyles)[]
      styles.forEach((key) => {
        if (overrides.has(key)) return
        if (commonStyle[key] === undefined) {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          commonStyle[key] = shapeStyle[key]
        } else {
          if (commonStyle[key] === shapeStyle[key]) return
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

  static getBinding(data: Data, id: string, pageId = data.appState.currentPageId): TLDrawBinding {
    return this.getPage(data, pageId).bindings[id]
  }

  static getBindings(data: Data, pageId = data.appState.currentPageId): TLDrawBinding[] {
    const page = this.getPage(data, pageId)
    return Object.values(page.bindings)
  }

  static getBindableShapeIds(data: Data) {
    return this.getShapes(data)
      .filter((shape) => TLDR.getShapeUtils(shape).canBind)
      .sort((a, b) => b.childIndex - a.childIndex)
      .map((shape) => shape.id)
  }

  static getBindingsWithShapeIds(data: Data, ids: string[]): TLDrawBinding[] {
    return Array.from(
      new Set(
        this.getBindings(data).filter((binding) => {
          return ids.includes(binding.toId) || ids.includes(binding.fromId)
        })
      ).values()
    )
  }

  static getRelatedBindings(data: Data, ids: string[]): TLDrawBinding[] {
    const changedShapeIds = new Set(ids)

    const page = this.getPage(data)

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

  /* -------------------------------------------------- */
  /*                     Assertions                     */
  /* -------------------------------------------------- */

  static assertShapeHasProperty<P extends keyof TLDrawShape>(
    shape: TLDrawShape,
    prop: P
  ): asserts shape is ShapesWithProp<P> {
    if (shape[prop] === undefined) {
      throw new Error()
    }
  }
}
