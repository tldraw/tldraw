import { Shape } from "types"
import { getShapeUtils } from "lib/shapes"
import * as vec from "utils/vec"
import Vector from "./vector"
import { vectorToPoint } from "utils/utils"

export const codeShapes = new Set<CodeShape<Shape>>([])

type WithVectors<T extends Shape> = {
  [key in keyof T]: number[] extends T[key] ? Vector : T[key]
}

/**
 * A base class for code shapes. Note that creating a shape adds it to the
 * shape map, while deleting it removes it from the collected shapes set
 */
export default class CodeShape<T extends Shape> {
  private _shape: T

  constructor(props: T) {
    this._shape = props
    codeShapes.add(this)
  }

  destroy() {
    codeShapes.delete(this)
  }

  moveTo(point: Vector) {
    this.shape.point = vectorToPoint(point)
  }

  translate(delta: Vector) {
    this.shape.point = vec.add(this._shape.point, vectorToPoint(delta))
  }

  rotate(rotation: number) {
    this.shape.rotation = rotation
  }

  scale(scale: number) {
    return getShapeUtils(this.shape).scale(this.shape, scale)
  }

  getBounds() {
    return getShapeUtils(this.shape).getBounds(this.shape)
  }

  hitTest(point: Vector) {
    return getShapeUtils(this.shape).hitTest(this.shape, vectorToPoint(point))
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
