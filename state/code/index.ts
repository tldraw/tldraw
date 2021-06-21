import { Mutable, Shape, ShapeUtility } from 'types'
import { createShape, getShapeUtils } from 'state/shape-utils'
import vec from 'utils/vec'
import Vector from './vector'
import Utils from './utils'

export const codeShapes = new Set<CodeShape<Shape>>([])

/**
 * A base class for code shapes. Note that creating a shape adds it to the
 * shape map, while deleting it removes it from the collected shapes set
 */
export default class CodeShape<T extends Shape> {
  private _shape: Mutable<T>
  private utils: ShapeUtility<T>

  constructor(props: T) {
    this._shape = createShape(props.type, props) as Mutable<T>
    this.utils = getShapeUtils<T>(this._shape)
    codeShapes.add(this)
  }

  destroy(): void {
    codeShapes.delete(this)
  }

  moveTo(point: Vector): CodeShape<T> {
    this.utils.setProperty(this._shape, 'point', Utils.vectorToPoint(point))
    return this
  }

  translate(delta: Vector): CodeShape<T> {
    this.utils.setProperty(
      this._shape,
      'point',
      vec.add(this._shape.point, Utils.vectorToPoint(delta))
    )
    return this
  }

  rotate(rotation: number): CodeShape<T> {
    this.utils.setProperty(this._shape, 'rotation', rotation)
    return this
  }

  getBounds(): CodeShape<T> {
    this.utils.getBounds(this.shape)
    return this
  }

  hitTest(point: Vector): CodeShape<T> {
    this.utils.hitTest(this.shape, Utils.vectorToPoint(point))
    return this
  }

  get shape(): T {
    return this._shape
  }

  get point(): number[] {
    return [...this.shape.point]
  }

  get rotation(): number {
    return this.shape.rotation
  }
}
