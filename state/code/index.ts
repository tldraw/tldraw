import {
  ColorStyle,
  DashStyle,
  Mutable,
  Shape,
  ShapeUtility,
  SizeStyle,
} from 'types'
import { createShape, getShapeUtils } from 'state/shape-utils'
import { uniqueId } from 'utils'
import Vec from 'utils/vec'

export const codeShapes = new Set<CodeShape<Shape>>([])

function getOrderedShapes() {
  return Array.from(codeShapes.values()).sort(
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
  protected utils: ShapeUtility<T>

  constructor(props: T) {
    this._shape = createShape(props.type, props) as Mutable<T>
    this.utils = getShapeUtils<T>(this._shape)
    codeShapes.add(this)
  }

  /**
   * Destroy the shape.
   *
   * ```ts
   * shape.destroy()
   * ```
   */
  destroy = (): void => {
    codeShapes.delete(this)
  }

  /**
   * Move the shape to a point.
   *
   * ```ts
   * shape.moveTo(100,100)
   * ```
   */
  moveTo = (point: number[]): CodeShape<T> => {
    return this.translateTo(point)
  }

  /**
   * Move the shape to a point.
   *
   * ```ts
   * shape.translateTo([100,100])
   * ```
   */
  translateTo = (point: number[]): CodeShape<T> => {
    this.utils.translateTo(this._shape, point)
    return this
  }

  /**
   * Move the shape by a delta.
   *
   * ```ts
   * shape.translateBy([100,100])
   * ```
   */
  translateBy = (delta: number[]): CodeShape<T> => {
    this.utils.translateTo(this._shape, delta)
    return this
  }

  /**
   * Rotate the shape.
   *
   * ```ts
   * shape.rotateTo(Math.PI / 2)
   * ```
   */
  rotateTo = (rotation: number): CodeShape<T> => {
    this.utils.rotateTo(this._shape, rotation, this.shape.rotation - rotation)
    return this
  }

  /**
   * Rotate the shape by a delta.
   *
   * ```ts
   * shape.rotateBy(Math.PI / 2)
   * ```
   */
  rotateBy = (rotation: number): CodeShape<T> => {
    this.utils.rotateBy(this._shape, rotation)
    return this
  }

  /**
   * Get the shape's bounding box.
   *
   * ```ts
   * const bounds = shape.getBounds()
   * ```
   */
  getBounds = (): CodeShape<T> => {
    this.utils.getBounds(this.shape)
    return this
  }

  /**
   * Test whether a point is inside of the shape.
   *
   * ```ts
   * const isHit = shape.hitTest()
   * ```
   */
  hitTest = (point: number[]): CodeShape<T> => {
    this.utils.hitTest(this.shape, point)
    return this
  }

  /**
   * Duplicate this shape.
   *
   * ```ts
   * const shapeB = shape.duplicate()
   * ```
   */
  duplicate = (): CodeShape<T> => {
    const duplicate = Object.assign(
      Object.create(Object.getPrototypeOf(this)),
      this
    )

    duplicate._shape = createShape(this._shape.type, {
      ...this._shape,
      id: uniqueId(),
    } as any)

    codeShapes.add(duplicate)
    return duplicate
  }

  /**
   * Move the shape to the back of the painting order.
   *
   * ```ts
   * shape.moveToBack()
   * ```
   */
  moveToBack = (): CodeShape<T> => {
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
   *
   * ```ts
   * shape.moveToFront()
   * ```
   */
  moveToFront = (): CodeShape<T> => {
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
   *
   * ```ts
   * shape.moveBackward()
   * ```
   */
  moveBackward = (): CodeShape<T> => {
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
   *
   * ```ts
   * shape.moveForward()
   * ```
   */
  moveForward = (): CodeShape<T> => {
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
   * The shape's underlying shape (readonly).
   *
   * ```ts
   * const underlyingShape = shape.shape
   * ```
   */
  get shape(): Readonly<T> {
    return this._shape
  }

  /**
   * The shape's current point.
   *
   * ```ts
   * const shapePoint = shape.point()
   * ```
   */
  get point(): number[] {
    return [...this.shape.point]
  }

  set point(point: number[]) {
    this.utils.translateTo(this._shape, point)
  }

  /**
   * The shape's current x position.
   *
   * ```ts
   * const shapeX = shape.x
   *
   * shape.x = 100
   * ```
   */
  get x(): number {
    return this.point[0]
  }

  set x(x: number) {
    this.utils.translateTo(this._shape, [x, this.y])
  }

  /**
   * The shape's current y position.
   *
   * ```ts
   * const shapeY = shape.y
   *
   * shape.y = 100
   * ```
   */
  get y(): number {
    return this.point[1]
  }

  set y(y: number) {
    this.utils.translateTo(this._shape, [this.x, y])
  }

  /**
   * The shape's rotation.
   *
   * ```ts
   * const shapeRotation = shape.rotation
   *
   * shape.rotation = Math.PI / 2
   * ```
   */
  get rotation(): number {
    return this.shape.rotation
  }

  set rotation(rotation: number) {
    this.utils.rotateTo(this._shape, rotation, rotation - this.shape.rotation)
  }

  /**
   * The shape's color style (ColorStyle).
   *
   * ```ts
   * const shapeColor = shape.color
   *
   * shape.color = ColorStyle.Red
   * ```
   */
  get color(): ColorStyle {
    return this.shape.style.color
  }

  set color(color: ColorStyle) {
    this.utils.applyStyles(this._shape, { color })
  }

  /**
   * The shape's dash style (DashStyle).
   *
   * ```ts
   * const shapeDash = shape.dash
   *
   * shape.dash = DashStyle.Dotted
   * ```
   */
  get dash(): DashStyle {
    return this.shape.style.dash
  }

  set dash(dash: DashStyle) {
    this.utils.applyStyles(this._shape, { dash })
  }

  /**
   * The shape's size (SizeStyle).
   *
   * ```ts
   * const shapeSize = shape.size
   *
   * shape.size = SizeStyle.Large
   * ```
   */
  get size(): SizeStyle {
    return this.shape.style.size
  }

  set size(size: SizeStyle) {
    this.utils.applyStyles(this._shape, { size })
  }

  /**
   * The shape's index in the painting order.
   *
   * ```ts
   * const shapeChildIndex = shape.childIndex
   *
   * shape.childIndex = 10
   * ```
   */
  get childIndex(): number {
    return this.shape.childIndex
  }

  set childIndex(childIndex: number) {
    this.utils.setProperty(this._shape, 'childIndex', childIndex)
  }

  /**
   * The shape's center.
   *
   * ```ts
   * const shapeCenter = shape.center
   *
   * shape.center = [100, 100]
   * ```
   */
  get center(): number[] {
    return this.utils.getCenter(this.shape)
  }

  set center(center: number[]) {
    const oldCenter = this.utils.getCenter(this.shape)
    const delta = Vec.sub(center, oldCenter)
    this.translateBy(delta)
  }
}
