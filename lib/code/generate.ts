import Rectangle from "./rectangle"
import Circle from "./circle"
import Ellipse from "./ellipse"
import Polyline from "./polyline"
import Dot from "./dot"
import Ray from "./ray"
import Line from "./line"
import Vector from "./vector"
import Utils from "./utils"
import { codeShapes } from "./index"

const scope = {
  Dot,
  Circle,
  Ellipse,
  Ray,
  Line,
  Polyline,
  Rectangle,
  Vector,
  Utils,
}

/**
 * Evaluate code, collecting generated shapes in the shape set. Return the
 * collected shapes as an array.
 * @param code
 */
export function getShapesFromCode(code: string) {
  codeShapes.clear()

  new Function(...Object.keys(scope), `${code}`)(...Object.values(scope))

  const generatedShapes = Array.from(codeShapes.values()).map((instance) => {
    instance.shape.isGenerated = true
    return instance.shape
  })

  return generatedShapes
}
