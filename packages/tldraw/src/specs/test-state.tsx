import { inputs, TLBoundsCorner, TLBoundsEdge, TLShapeUtil, Utils, Vec } from '@tldraw/core'
import { Data, TLDrawShape } from '../../src'
import { createShape, tldrawShapeUtils } from '../../src/lib/shapes'
import { TLDrawState } from '../../src/lib/state'
import { mockDocument } from './__mocks__/mock-document'

interface PointerOptions {
  id?: number
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

export class TLDrawTestState extends TLDrawState {
  snapshot: Data

  constructor() {
    super(tldrawShapeUtils)
    this.toggleTestMode()
    this.snapshot = Utils.deepClone(this.state.data)
    this.updateFromDocument(mockDocument)
    this.save()
  }

  /* -------------------- Specific -------------------- */

  /**
   * Save a snapshot of the state's current data.
   *
   * ### Example
   *
   *```ts
   * tt.save()
   * tt.restore()
   *```
   */
  save(): TLDrawTestState {
    this.snapshot = Utils.deepClone(this.data)
    return this
  }

  /**
   * Restore the state's saved data.
   *
   * ### Example
   *
   *```ts
   * tt.save()
   * tt.restore()
   *```
   */
  restore(): TLDrawTestState {
    this.state.forceData(this.snapshot)
    return this
  }

  /**
   * Reset the test state.
   *
   * ### Example
   *
   *```ts
   * tt.reset()
   *```
   */
  reset(): TLDrawTestState {
    this.state.reset()
    this.state
      .send('UNMOUNTED')
      .send('MOUNTED', { roomId: 'TESTING' })
      .send('MOUNTED_SHAPES')
      .send('LOADED_FROM_FILE', { json: JSON.stringify(mockDocument) })

    return this
  }

  /**
   * Reset the document state. Will remove all shapes and extra pages.
   *
   * ### Example
   *
   *```ts
   * tt.resetDocumentState()
   *```
   */
  resetDocumentState(): TLDrawTestState {
    this.state.send('RESET_DOCUMENT_STATE').send('TOGGLED_TEST_MODE')
    return this
  }

  /**
   * Create a new shape on the current page. Optionally provide an id.
   *
   * ### Example
   *
   *```ts
   * tt.createShape({ type: ShapeType.Rectangle, point: [100, 100]})
   * tt.createShape({ type: ShapeType.Rectangle, point: [100, 100]}, "myId")
   *```
   */
  createShape(props: Partial<TLDrawShape>, id = Utils.uniqueId()): TLDrawTestState {
    const shape = createShape(props.type || 'rectangle', props)

    this.getShapeUtils(shape).setProperty(shape, 'id', id).setProperty(shape, 'parentId', this.currentPageId)

    this.pages[this.currentPageId].shapes[shape.id] = shape
    return this
  }

  /**
   * Click a shape.
   *
   * ### Example
   *
   *```ts
   * tt.clickShape("myShapeId")
   *```
   */
  clickShape(id: string, options: PointerOptions = {}): TLDrawTestState {
    const shape = this.data.page.shapes[id]
    const [x, y] = shape ? Vec.add(shape.point, [1, 1]) : [0, 0]

    this.state
      .send('POINTED_SHAPE', inputs.pointerDown(this.fakePoint({ x, y, ...options }), id))
      .send('STOPPED_POINTING', inputs.pointerUp(this.fakePoint({ x, y, ...options }), id))

    return this
  }

  /**
   * Start a click (but do not stop it).
   *
   * ### Example
   *
   *```ts
   * tt.startClick("myShapeId")
   *```
   */
  startClick(id: string, options: PointerOptions = {}): TLDrawTestState {
    const shape = this.getShape(this.state.data, id)
    const [x, y] = shape ? Vec.add(shape.point, [1, 1]) : [0, 0]

    if (id === 'canvas') {
      this.state.send('POINTED_CANVAS', inputs.pointerDown(this.fakePoint({ x, y, ...options }), id))
      return this
    }

    this.state.send('POINTED_SHAPE', inputs.pointerDown(this.fakePoint({ x, y, ...options }), id))

    return this
  }

  /**
   * Stop a click (after starting it).
   *
   * ### Example
   *
   *```ts
   * tt.stopClick("myShapeId")
   *```
   */
  stopClick(id: string, options: PointerOptions = {}): TLDrawTestState {
    const shape = this.getShape(this.state.data, id)
    const [x, y] = shape ? Vec.add(shape.point, [1, 1]) : [0, 0]

    this.state.send('STOPPED_POINTING', inputs.pointerUp(this.fakePoint({ x, y, ...options }), id))

    return this
  }

  /**
   * Double click a shape.
   *
   * ### Example
   *
   *```ts
   * tt.clickShape("myShapeId")
   *```
   */
  doubleClickShape(id: string, options: PointerOptions = {}): TLDrawTestState {
    const shape = this.getShape(this.state.data, id)
    const [x, y] = shape ? Vec.add(shape.point, [1, 1]) : [0, 0]

    this.state
      .send('DOUBLE_POINTED_SHAPE', inputs.pointerDown(this.fakePoint({ x, y, ...options }), id))
      .send('STOPPED_POINTING', inputs.pointerUp(this.fakePoint({ x, y, ...options }), id))

    return this
  }

  /**
   * Click the canvas.
   *
   * ### Example
   *
   *```ts
   * tt.clickCanvas("myShapeId")
   *```
   */
  clickCanvas(options: PointerOptions = {}): TLDrawTestState {
    this.state
      .send('POINTED_CANVAS', inputs.pointerDown(this.fakePoint(options), 'canvas'))
      .send('STOPPED_POINTING', inputs.pointerUp(this.fakePoint(options), 'canvas'))

    return this
  }

  /**
   * Click the background / body of the bounding box.
   *
   * ### Example
   *
   *```ts
   * tt.clickBounds()
   *```
   */
  clickBounds(options: PointerOptions = {}): TLDrawTestState {
    this.state
      .send('POINTED_BOUNDS', inputs.pointerDown(this.fakePoint(options), 'bounds'))
      .send('STOPPED_POINTING', inputs.pointerUp(this.fakePoint(options), 'bounds'))

    return this
  }

  /**
   * Start clicking bounds.
   *
   * ### Example
   *
   *```ts
   * tt.startClickingBounds()
   *```
   */
  startClickingBounds(options: PointerOptions = {}): TLDrawTestState {
    this.state.send('POINTED_BOUNDS', inputs.pointerDown(this.fakePoint(options), 'bounds'))

    return this
  }

  /**
   * Stop clicking the bounding box.
   *
   * ### Example
   *
   *```ts
   * tt.stopClickingBounds()
   *```
   */
  stopClickingBounds(options: PointerOptions = {}): TLDrawTestState {
    this.state.send('STOPPED_POINTING', inputs.pointerUp(this.fakePoint(options), 'bounds'))

    return this
  }

  /**
   * Start clicking a bounds handle.
   *
   * ### Example
   *
   *```ts
   * tt.startClickingBoundsHandle(Edge.Top)
   *```
   */
  startClickingBoundsHandle(
    handle: TLBoundsCorner | TLBoundsEdge | 'center',
    options: PointerOptions = {},
  ): TLDrawTestState {
    this.state.send('POINTED_BOUNDS_HANDLE', inputs.pointerDown(this.fakePoint(options), handle))

    return this
  }

  /**
   * Move the pointer to a new point, or to several points in order.
   *
   * ### Example
   *
   *```ts
   * tt.movePointerTo([100, 100])
   * tt.movePointerTo([100, 100], { shiftKey: true })
   * tt.movePointerTo([[100, 100], [150, 150], [200, 200]])
   *```
   */
  movePointerTo(to: number[] | number[][], options: Omit<PointerOptions, 'x' | 'y'> = {}): TLDrawTestState {
    if (Array.isArray(to[0])) {
      ;(to as number[][]).forEach(([x, y]) => {
        this.state.send('MOVED_POINTER', inputs.pointerMove(this.fakePoint({ x, y, ...options })))
      })
    } else {
      const [x, y] = to as number[]
      this.state.send('MOVED_POINTER', inputs.pointerMove(this.fakePoint({ x, y, ...options })))
    }

    return this
  }

  /**
   * Move the pointer by a delta.
   *
   * ### Example
   *
   *```ts
   * tt.movePointerBy([10,10])
   * tt.movePointerBy([10,10], { shiftKey: true })
   *```
   */
  movePointerBy(by: number[] | number[][], options: Omit<PointerOptions, 'x' | 'y'> = {}): TLDrawTestState {
    let pt = inputs.pointer?.point || [0, 0]

    if (Array.isArray(by[0])) {
      ;(by as number[][]).forEach((delta) => {
        pt = Vec.add(pt, delta)

        this.state.send('MOVED_POINTER', inputs.pointerMove(this.fakePoint({ x: pt[0], y: pt[1], ...options })))
      })
    } else {
      pt = Vec.add(pt, by as number[])

      this.state.send('MOVED_POINTER', inputs.pointerMove(this.fakePoint({ x: pt[0], y: pt[1], ...options })))
    }

    return this
  }

  /**
   * Move pointer over a shape. Will move the pointer to the top-left corner of the shape.
   *
   * ###
   * ```
   * tt.movePointerOverShape('myShapeId', [100, 100])
   * ```
   */
  movePointerOverShape(id: string, options: Omit<PointerOptions, 'x' | 'y'> = {}): TLDrawTestState {
    const shape = this.getShape(this.state.data, id)
    const [x, y] = Vec.add(shape.point, [1, 1])

    this.state.send('MOVED_OVER_SHAPE', inputs.pointerEnter(this.fakePoint({ x, y, ...options }), id))

    return this
  }

  /**
   * Move the pointer over a group. Will move the pointer to the top-left corner of the group.
   *
   * ### Example
   *
   *```ts
   * tt.movePointerOverHandle('myGroupId')
   * tt.movePointerOverHandle('myGroupId', { shiftKey: true })
   *```
   */
  movePointerOverGroup(id: string, options: Omit<PointerOptions, 'x' | 'y'> = {}): TLDrawTestState {
    const shape = this.getShape(this.state.data, id)
    const [x, y] = Vec.add(shape.point, [1, 1])

    this.state.send('MOVED_OVER_GROUP', inputs.pointerEnter(this.fakePoint({ x, y, ...options }), id))

    return this
  }

  /**
   * Move the pointer over a handle. Will move the pointer to the top-left corner of the handle.
   *
   * ### Example
   *
   *```ts
   * tt.movePointerOverHandle('bend')
   * tt.movePointerOverHandle('bend', { shiftKey: true })
   *```
   */
  movePointerOverHandle(id: string, options: Omit<PointerOptions, 'x' | 'y'> = {}): TLDrawTestState {
    const shape = this.getShape(this.state.data, id)
    const handle = shape.handles?.[id]
    if (!handle) throw Error('No handle!')
    const [x, y] = Vec.add(handle.point, [1, 1])

    this.state.send('MOVED_OVER_HANDLE', inputs.pointerEnter(this.fakePoint({ x, y, ...options }), id))

    return this
  }

  /**
   * Select all shapes.
   *
   * ### Example
   *
   *```ts
   * tt.deselectAll()
   *```
   */
  selectAll(): TLDrawTestState {
    this.state.send('SELECTED_ALL')
    return this
  }

  /**
   * Deselect all shapes.
   *
   * ### Example
   *
   *```ts
   * tt.deselectAll()
   *```
   */
  deselectAll(): TLDrawTestState {
    this.state.send('DESELECTED_ALL')
    return this
  }

  /**
   * Delete the selected shapes.
   *
   * ### Example
   *
   *```ts
   * tt.pressDelete()
   *```
   */
  pressDelete(): TLDrawTestState {
    this.state.send('DELETED')
    return this
  }

  /**
   * Undo.
   *
   * ### Example
   *
   *```ts
   * tt.undo()
   *```
   */
  undo(): TLDrawTestState {
    this.state.send('UNDO')
    return this
  }

  /**
   * Redo.
   *
   * ### Example
   *
   *```ts
   * tt.redo()
   *```
   */
  redo(): TLDrawTestState {
    this.state.send('REDO')
    return this
  }

  /* ---------------- Getting Data Out ---------------- */

  /**
   * Get the current selected ids.
   *
   * ### Example
   *
   *```ts
   * example
   *```
   */
  get selectedIds(): string[] {
    return this.getSelectedIds(this.data)
  }

  /**
   * Get shapes for the current page.
   *
   * ### Example
   *
   *```ts
   * tt.getShapes()
   *```
   */
  getShapes(): TLDrawShape[] {
    return Object.values(this.pages[this.currentPageId].shapes)
  }

  /**
   * Get ids of the page's children sorted by their child index.
   *
   * ### Example
   *
   *```ts
   * tt.getSortedPageShapes()
   *```
   */
  getSortedPageShapeIds(): string[] {
    return this.getShapes()
      .sort((a, b) => a.childIndex - b.childIndex)
      .map((shape) => shape.id)
  }

  /**
   * Get the only selected shape. If more than one shape is selected, the test will fail.
   *
   * ### Example
   *
   *```ts
   * tt.getOnlySelectedShape()
   *```
   */
  getOnlySelectedShape(): TLDrawShape | undefined {
    const selectedShapes = this.getSelectedShapes(this.data)
    return selectedShapes.length === 1 ? selectedShapes[0] : undefined
  }

  /**
   * Get whether the provided ids are the current selected ids. If the `strict` argument is `true`, then the result will be false if the state has selected ids in addition to those provided.
   *
   * ### Example
   *
   *```ts
   * tt.idsAreSelected(state.data, ['rectangleId', 'ellipseId'])
   * tt.idsAreSelected(state.data, ['rectangleId', 'ellipseId'], true)
   *```
   */
  idsAreSelected(ids: string[], strict = true): boolean {
    const { selectedIds } = this.data.pageState
    return (strict ? selectedIds.length === ids.length : true) && ids.every((id) => selectedIds.includes(id))
  }

  /**
   * Get whether the shape with the provided id has the provided parent id.
   *
   * ### Example
   *
   *```ts
   * tt.hasParent('childId', 'parentId')
   *```
   */
  hasParent(childId: string, parentId: string): boolean {
    return this.getShape(this.data, childId).parentId === parentId
  }

  /**
   * Assert that a shape has the provided type.
   *
   * ### Example
   *
   *```ts
   * tt.example
   *```
   */
  assertShapeType(shapeId: string, type: TLDrawShape['type']): boolean {
    const shape = this.getShape(this.data, shapeId)
    if (shape.type !== type) {
      throw new TypeError(`expected shape ${shapeId} to be of type ${type}, found ${shape?.type} instead`)
    }
    return true
  }

  /**
   * Assert that the provided shape has the provided props.
   *
   * ### Example
   *
   *```
   * tt.assertShapeProps(myShape, { point: [0,0], style: { color: ColorStyle.Blue } } )
   *```
   */
  assertShapeProps<T extends TLDrawShape>(shape: T, props: { [K in keyof Partial<T>]: T[K] }): boolean {
    for (const key in props) {
      let result: boolean
      const value = props[key]

      if (Array.isArray(value)) {
        result = Utils.deepCompareArrays(value, shape[key] as typeof value)
      } else if (typeof value === 'object') {
        const target = shape[key] as typeof value
        result =
          target &&
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-ignore
          Object.entries(value).every(([k, v]) => target[k] === props[key][v])
      } else {
        result = shape[key] === value
      }

      if (!result) {
        throw new TypeError(
          `expected shape ${shape.id} to have property ${key}: ${props[key]}, found ${key}: ${shape[key]} instead`,
        )
      }
    }

    return true
  }

  /**
   * Get a shape and test it.
   *
   * ### Example
   *
   *```ts
   * tt.testShape("myShapeId", (myShape, utils) => expect(utils(myShape).getBounds()).toMatchSnapshot() )
   *```
   */
  testShape<T extends TLDrawShape>(
    id: string,
    fn: (shape: T, shapeUtils: TLShapeUtil<TLDrawShape>) => boolean,
  ): boolean {
    const shape = this.getShape<T>(this.state.data, id)
    return fn(shape, shape && this.getShapeUtils(shape))
  }

  /**
   * Get a fake PointerEvent.
   *
   * ### Example
   *
   *```ts
   * tt.fakePoint()
   * tt.fakePoint({ x: 0, y: 0})
   * tt.fakePoint({ x: 0, y: 0, shiftKey: true } )
   *```
   */
  fakePoint(options: PointerOptions = {} as PointerOptions): PointerEvent {
    const { id = 1, x = 0, y = 0, shiftKey = false, altKey = false, ctrlKey = false } = options

    return {
      shiftKey,
      altKey,
      ctrlKey,
      metaKey: ctrlKey,
      pointerId: id,
      clientX: x,
      clientY: y,
    } as PointerEvent
  }
}
