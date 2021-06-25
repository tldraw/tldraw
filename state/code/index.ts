import {
  ColorStyle,
  DashStyle,
  Mutable,
  Shape,
  ShapeUtility,
  SizeStyle,
} from 'types'
import { createShape, getShapeUtils } from 'state/shape-utils'
import { setToArray } from 'utils'

export const codeShapes = new Set<CodeShape<Shape>>([])

function getOrderedShapes() {
  return setToArray(codeShapes).sort(
    (a, b) => a.shape.childIndex - b.shape.childIndex
  )
}

/**
 * A base class for code shapes. Note that creating a shape adds it to the
 * shape map, while deleting it removes it from the collected shapes set
 */

/* ----------------- Start Copy Here ---------------- */

export default class CodeShape<T extends Shape> {
  private _shape: Mutable<T>
  private utils: ShapeUtility<T>

  constructor(props: T) {
    this._shape = createShape(props.type, props) as Mutable<T>
    this.utils = getShapeUtils<T>(this._shape)
    codeShapes.add(this)
  }

  export(): Mutable<T> {
    return { ...this._shape }
  }

  /**
   * Destroy the shape.
   */
  destroy(): void {
    codeShapes.delete(this)
  }

  /**
   * Move the shape to a point.
   * @param delta
   */
  moveTo(point: number[]): CodeShape<T> {
    return this.translateTo(point)
  }

  /**
   * Move the shape to a point.
   * @param delta
   */
  translateTo(point: number[]): CodeShape<T> {
    this.utils.translateTo(this._shape, point)
    return this
  }

  /**
   * Move the shape by a delta.
   * @param delta
   */
  translateBy(delta: number[]): CodeShape<T> {
    this.utils.translateTo(this._shape, delta)
    return this
  }

  /**
   * Rotate the shape.
   */
  rotateTo(rotation: number): CodeShape<T> {
    this.utils.rotateTo(this._shape, rotation, this.shape.rotation - rotation)
    return this
  }

  /**
   * Rotate the shape by a delta.
   */
  rotateBy(rotation: number): CodeShape<T> {
    this.utils.rotateBy(this._shape, rotation)
    return this
  }

  /**
   * Get the shape's bounding box.
   */
  getBounds(): CodeShape<T> {
    this.utils.getBounds(this.shape)
    return this
  }

  /**
   * Test whether a point is inside of the shape.
   */
  hitTest(point: number[]): CodeShape<T> {
    this.utils.hitTest(this.shape, point)
    return this
  }

  /**
   * Move the shape to the back of the painting order.
   */
  moveToBack(): CodeShape<T> {
    const sorted = getOrderedShapes()

    if (sorted.length <= 1) return

    const first = sorted[0].childIndex
    sorted.forEach((shape) => shape.childIndex++)
    this.childIndex = first

    codeShapes.clear()
    sorted.forEach((shape) => codeShapes.add(shape))

    return this
  }

  /**
   * Move the shape to the top of the painting order.
   */
  moveToFront(): CodeShape<T> {
    const sorted = getOrderedShapes()

    if (sorted.length <= 1) return

    const ahead = sorted.slice(sorted.indexOf(this))
    const last = ahead[ahead.length - 1].childIndex
    ahead.forEach((shape) => shape.childIndex--)
    this.childIndex = last

    codeShapes.clear()
    sorted.forEach((shape) => codeShapes.add(shape))

    return this
  }

  /**
   * Move the shape backward in the painting order.
   */
  moveBackward(): CodeShape<T> {
    const sorted = getOrderedShapes()

    if (sorted.length <= 1) return

    const next = sorted[sorted.indexOf(this) - 1]

    if (!next) return

    const index = next.childIndex
    next.childIndex = this.childIndex
    this.childIndex = index

    codeShapes.clear()
    sorted.forEach((shape) => codeShapes.add(shape))

    return this
  }

  /**
   * Move the shape forward in the painting order.
   */
  moveForward(): CodeShape<T> {
    const sorted = getOrderedShapes()

    if (sorted.length <= 1) return

    const next = sorted[sorted.indexOf(this) + 1]

    if (!next) return

    const index = next.childIndex
    next.childIndex = this.childIndex
    this.childIndex = index

    codeShapes.clear()
    sorted.forEach((shape) => codeShapes.add(shape))

    return this
  }

  get id(): string {
    return this._shape.id
  }

  /**
   * The shape's underlying shape.
   */
  get shape(): T {
    return this._shape
  }

  /**
   * The shape's current point.
   */
  get point(): number[] {
    return [...this.shape.point]
  }

  set point(point: number[]) {
    getShapeUtils(this.shape).translateTo(this._shape, point)
  }

  /**
   * The shape's rotation.
   */
  get rotation(): number {
    return this.shape.rotation
  }

  set rotation(rotation: number) {
    getShapeUtils(this.shape).rotateTo(
      this._shape,
      rotation,
      rotation - this.shape.rotation
    )
  }

  /**
   * The shape's color style.
   */
  get color(): ColorStyle {
    return this.shape.style.color
  }

  set color(color: ColorStyle) {
    getShapeUtils(this.shape).applyStyles(this._shape, { color })
  }

  /**
   * The shape's dash style.
   */
  get dash(): DashStyle {
    return this.shape.style.dash
  }

  set dash(dash: DashStyle) {
    getShapeUtils(this.shape).applyStyles(this._shape, { dash })
  }

  /**
   * The shape's stroke width.
   */
  get strokeWidth(): SizeStyle {
    return this.shape.style.size
  }

  set strokeWidth(size: SizeStyle) {
    getShapeUtils(this.shape).applyStyles(this._shape, { size })
  }

  /**
   * The shape's index in the painting order.
   */
  get childIndex(): number {
    return this.shape.childIndex
  }

  set childIndex(childIndex: number) {
    getShapeUtils(this.shape).setProperty(this._shape, 'childIndex', childIndex)
  }
}
