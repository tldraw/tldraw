import _state from 'state'
import tld from 'utils/tld'
import inputs from 'state/inputs'
import { createShape, getShapeUtils } from 'state/shape-utils'
import { Corner, Data, Edge, Shape, ShapeType, ShapeUtility } from 'types'
import { deepClone, deepCompareArrays, uniqueId, vec } from 'utils'
import * as mockDocument from './__mocks__/document.json'

type State = typeof _state

export const rectangleId = 'e43559cb-6f41-4ae4-9c49-158ed1ad2f72'
export const arrowId = 'fee77127-e779-4576-882b-b1bf7c7e132f'

interface PointerOptions {
  id?: number
  x?: number
  y?: number
  shiftKey?: boolean
  altKey?: boolean
  ctrlKey?: boolean
}

class TestState {
  state: State
  snapshot: Data

  constructor() {
    this.state = _state
    this.state.send('TOGGLED_TEST_MODE')
    this.snapshot = deepClone(this.state.data)
    this.reset()
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
  reset(): TestState {
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
  resetDocumentState(): TestState {
    this.state.send('RESET_DOCUMENT_STATE').send('TOGGLED_TEST_MODE')
    return this
  }

  /**
   * Send a message to the state.
   *
   * ### Example
   *
   *```ts
   * tt.send("MOVED_TO_FRONT")
   *```
   */
  send(eventName: string, payload?: unknown): TestState {
    this.state.send(eventName, payload)
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
  createShape(props: Partial<Shape>, id = uniqueId()): TestState {
    const shape = createShape(props.type, props)
    getShapeUtils(shape).setProperty(shape, 'id', id)
    this.data.document.pages[this.data.currentPageId].shapes[shape.id] = shape
    return this
  }

  /**
   * Get the sorted ids of the page's children.
   *
   * ### Example
   *
   *```ts
   * tt.getSortedPageShapes()
   *```
   */
  getSortedPageShapeIds(): string[] {
    return Object.values(
      this.data.document.pages[this.data.currentPageId].shapes
    )
      .sort((a, b) => a.childIndex - b.childIndex)
      .map((shape) => shape.id)
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
    const selectedIds = tld.getSelectedIds(this.data)
    return (
      (strict ? selectedIds.length === ids.length : true) &&
      ids.every((id) => selectedIds.includes(id))
    )
  }

  get selectedIds(): string[] {
    return tld.getSelectedIds(this.data)
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
    return tld.getShape(this.data, childId).parentId === parentId
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
  getOnlySelectedShape(): Shape {
    const selectedShapes = tld.getSelectedShapes(this.data)
    return selectedShapes.length === 1 ? selectedShapes[0] : undefined
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
  assertShapeType(shapeId: string, type: ShapeType): boolean {
    const shape = tld.getShape(this.data, shapeId)
    if (shape.type !== type) {
      throw new TypeError(
        `expected shape ${shapeId} to be of type ${type}, found ${shape?.type} instead`
      )
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
  assertShapeProps<T extends Shape>(
    shape: T,
    props: { [K in keyof Partial<T>]: T[K] }
  ): boolean {
    for (const key in props) {
      let result: boolean
      const value = props[key]

      if (Array.isArray(value)) {
        result = deepCompareArrays(value, shape[key] as typeof value)
      } else if (typeof value === 'object') {
        const target = shape[key] as typeof value
        result =
          target &&
          Object.entries(value).every(([k, v]) => target[k] === props[key][v])
      } else {
        result = shape[key] === value
      }

      if (!result) {
        throw new TypeError(
          `expected shape ${shape.id} to have property ${key}: ${props[key]}, found ${key}: ${shape[key]} instead`
        )
      }
    }

    return true
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
  clickShape(id: string, options: PointerOptions = {}): TestState {
    const shape = tld.getShape(this.data, id)
    const [x, y] = shape ? vec.add(shape.point, [1, 1]) : [0, 0]

    this.state
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(TestState.point({ x, y, ...options }), id)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(TestState.point({ x, y, ...options }), id)
      )

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
  startClick(id: string, options: PointerOptions = {}): TestState {
    const shape = tld.getShape(this.data, id)
    const [x, y] = shape ? vec.add(shape.point, [1, 1]) : [0, 0]

    if (id === 'canvas') {
      this.state.send(
        'POINTED_CANVAS',
        inputs.pointerDown(TestState.point({ x, y, ...options }), id)
      )
      return this
    }

    this.state.send(
      'POINTED_SHAPE',
      inputs.pointerDown(TestState.point({ x, y, ...options }), id)
    )

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
  stopClick(id: string, options: PointerOptions = {}): TestState {
    const shape = tld.getShape(this.data, id)
    const [x, y] = shape ? vec.add(shape.point, [1, 1]) : [0, 0]

    this.state.send(
      'STOPPED_POINTING',
      inputs.pointerUp(TestState.point({ x, y, ...options }), id)
    )

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
  doubleClickShape(id: string, options: PointerOptions = {}): TestState {
    const shape = tld.getShape(this.data, id)
    const [x, y] = shape ? vec.add(shape.point, [1, 1]) : [0, 0]

    this.state
      .send(
        'DOUBLE_POINTED_SHAPE',
        inputs.pointerDown(TestState.point({ x, y, ...options }), id)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(TestState.point({ x, y, ...options }), id)
      )

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
  clickCanvas(options: PointerOptions = {}): TestState {
    this.state
      .send(
        'POINTED_CANVAS',
        inputs.pointerDown(TestState.point(options), 'canvas')
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(TestState.point(options), 'canvas')
      )

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
  clickBounds(options: PointerOptions = {}): TestState {
    this.state
      .send(
        'POINTED_BOUNDS',
        inputs.pointerDown(TestState.point(options), 'bounds')
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(TestState.point(options), 'bounds')
      )

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
  startClickingBounds(options: PointerOptions = {}): TestState {
    this.state.send(
      'POINTED_BOUNDS',
      inputs.pointerDown(TestState.point(options), 'bounds')
    )

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
  stopClickingBounds(options: PointerOptions = {}): TestState {
    this.state.send(
      'STOPPED_POINTING',
      inputs.pointerUp(TestState.point(options), 'bounds')
    )

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
    handle: Corner | Edge | 'center',
    options: PointerOptions = {}
  ): TestState {
    this.state.send(
      'POINTED_BOUNDS_HANDLE',
      inputs.pointerDown(TestState.point(options), handle)
    )

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
  movePointerTo(
    to: number[] | number[][],
    options: Omit<PointerOptions, 'x' | 'y'> = {}
  ): TestState {
    if (Array.isArray(to[0])) {
      ;(to as number[][]).forEach(([x, y]) => {
        this.state.send(
          'MOVED_POINTER',
          inputs.pointerMove(TestState.point({ x, y, ...options }))
        )
      })
    } else {
      const [x, y] = to as number[]
      this.state.send(
        'MOVED_POINTER',
        inputs.pointerMove(TestState.point({ x, y, ...options }))
      )
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
  movePointerBy(
    by: number[] | number[][],
    options: Omit<PointerOptions, 'x' | 'y'> = {}
  ): TestState {
    let pt = inputs.pointer?.point || [0, 0]

    if (Array.isArray(by[0])) {
      ;(by as number[][]).forEach((delta) => {
        pt = vec.add(pt, delta)

        this.state.send(
          'MOVED_POINTER',
          inputs.pointerMove(
            TestState.point({ x: pt[0], y: pt[1], ...options })
          )
        )
      })
    } else {
      pt = vec.add(pt, by as number[])

      this.state.send(
        'MOVED_POINTER',
        inputs.pointerMove(TestState.point({ x: pt[0], y: pt[1], ...options }))
      )
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
  movePointerOverShape(
    id: string,
    options: Omit<PointerOptions, 'x' | 'y'> = {}
  ): TestState {
    const shape = tld.getShape(this.state.data, id)
    const [x, y] = vec.add(shape.point, [1, 1])

    this.state.send(
      'MOVED_OVER_SHAPE',
      inputs.pointerEnter(TestState.point({ x, y, ...options }), id)
    )

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
  movePointerOverGroup(
    id: string,
    options: Omit<PointerOptions, 'x' | 'y'> = {}
  ): TestState {
    const shape = tld.getShape(this.state.data, id)
    const [x, y] = vec.add(shape.point, [1, 1])

    this.state.send(
      'MOVED_OVER_GROUP',
      inputs.pointerEnter(TestState.point({ x, y, ...options }), id)
    )

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
  movePointerOverHandle(
    id: string,
    options: Omit<PointerOptions, 'x' | 'y'> = {}
  ): TestState {
    const shape = tld.getShape(this.state.data, id)
    const handle = shape.handles?.[id]
    const [x, y] = vec.add(handle.point, [1, 1])

    this.state.send(
      'MOVED_OVER_HANDLE',
      inputs.pointerEnter(TestState.point({ x, y, ...options }), id)
    )

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
  deselectAll(): TestState {
    this.state.send('DESELECTED_ALL')
    return this
  }

  /**
   * Delete the selected shapes
   *
   * ### Example
   *
   *```ts
   * tt.pressDelete()
   *```
   */
  pressDelete(): TestState {
    this.state.send('DELETED')
    return this
  }

  /**
   * Get a shape and test it.
   *
   * ### Example
   *
   *```ts
   * tt.testShape("myShapeId", myShape => myShape )
   *```
   */
  testShape<T extends Shape>(
    id: string,
    fn: (shape: T, shapeUtils: ShapeUtility<T>) => boolean
  ): boolean {
    const shape = this.getShape<T>(id)
    return fn(shape, shape && getShapeUtils(shape))
  }

  /**
   * Get a shape
   *
   * ### Example
   *
   *```ts
   * tt.getShape("myShapeId")
   *```
   */
  getShape<T extends Shape>(id: string): T {
    return tld.getShape(this.data, id) as T
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
  undo(): TestState {
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
  redo(): TestState {
    this.state.send('REDO')
    return this
  }

  /**
   * Save a snapshot of the state's current data.
   *
   * ### Example
   *
   *```ts
   * tt.save()
   *```
   */
  save(): TestState {
    this.snapshot = deepClone(this.data)
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
  restore(): TestState {
    this.state.forceData(this.snapshot)
    return this
  }

  /**
   * Get the state's current data.
   *
   * ### Example
   *
   *```ts
   * tt.data
   *```
   */
  get data(): Readonly<Data> {
    return this.state.data
  }

  /**
   * Get a fake PointerEvent.
   *
   * ### Example
   *
   *```ts
   * tt.point()
   * tt.point({ x: 0, y: 0})
   * tt.point({ x: 0, y: 0, shiftKey: true } )
   *```
   */
  static point(options: PointerOptions = {} as PointerOptions): PointerEvent {
    const {
      id = 1,
      x = 0,
      y = 0,
      shiftKey = false,
      altKey = false,
      ctrlKey = false,
    } = options

    return {
      shiftKey,
      altKey,
      ctrlKey,
      pointerId: id,
      clientX: x,
      clientY: y,
    } as any
  }
}

export default TestState
