import { Shape } from "types"
import shapeUtilityMap, {
  createShape,
  getShapeUtils,
  ShapeUtility,
} from "lib/shape-utils"
import * as vec from "utils/vec"
import Vector from "./vector"
import { vectorToPoint } from "utils/utils"

export const codeShapes = new Set<CodeShape<Shape>>([])

/**
 * A base class for code shapes. Note that creating a shape adds it to the
 * shape map, while deleting it removes it from the collected shapes set
 */
export default class CodeShape<T extends Shape> {
  private _shape: T
  private utils: ShapeUtility<T>

  constructor(props: T) {
    this._shape = createShape<T>(props.type, props)
    this.utils = getShapeUtils<T>(this._shape)
    codeShapes.add(this)
  }

  destroy() {
    codeShapes.delete(this)
  }

  moveTo(point: Vector) {
    this.utils.translateTo(this._shape, vectorToPoint(point))
    return this
  }

  translate(delta: Vector) {
    this.utils.translateTo(
      this._shape,
      vec.add(this._shape.point, vectorToPoint(delta))
    )
    return this
  }

  rotate(rotation: number) {
    this.utils.rotateTo(this._shape, rotation)
    return this
  }

  getBounds() {
    this.utils.getBounds(this.shape)
    return this
  }

  hitTest(point: Vector) {
    this.utils.hitTest(this.shape, vectorToPoint(point))
    return this
  }

  get shape() {
    return this._shape
  }

  get point() {
    return [...this.shape.point]
  }

  get rotation() {
    return this.shape.rotation
  }
}
