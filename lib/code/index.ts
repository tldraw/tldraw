import { Shape } from "types"
import * as vec from "utils/vec"
import { getShapeUtils } from "lib/shapes"

export default class CodeShape<T extends Shape> {
  private _shape: T

  constructor(props: T) {
    this._shape = props
    shapeMap.add(this)
  }

  destroy() {
    shapeMap.delete(this)
  }

  moveTo(point: number[]) {
    this.shape.point = point
  }

  translate(delta: number[]) {
    this.shape.point = vec.add(this._shape.point, delta)
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

  hitTest(point: number[]) {
    return getShapeUtils(this.shape).hitTest(this.shape, point)
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

export const shapeMap = new Set<CodeShape<Shape>>([])
