import Rectangle from "./rectangle"
import Circle from "./circle"
import Ellipse from "./ellipse"
import Polyline from "./polyline"
import Dot from "./dot"
import Ray from "./ray"
import Line from "./line"
import Vector from "./vector"
import Utils from "./utils"
import { NumberControl, VectorControl, codeControls, controls } from "./control"
import { codeShapes } from "./index"
import { CodeControl } from "types"

const baseScope = {
  Dot,
  Circle,
  Ellipse,
  Ray,
  Line,
  Polyline,
  Rectangle,
  Vector,
  Utils,
  VectorControl,
  NumberControl,
}

/**
 * Evaluate code, collecting generated shapes in the shape set. Return the
 * collected shapes as an array.
 * @param code
 */
export function generateFromCode(code: string) {
  codeControls.clear()
  codeShapes.clear()
  ;(window as any).isUpdatingCode = false

  const scope = { ...baseScope, controls }

  new Function(...Object.keys(scope), `${code}`)(...Object.values(scope))

  const generatedShapes = Array.from(codeShapes.values()).map(
    (instance) => instance.shape
  )

  const generatedControls = Array.from(codeControls.values())

  return { shapes: generatedShapes, controls: generatedControls }
}

/**
 * Evaluate code, collecting generated shapes in the shape set. Return the
 * collected shapes as an array.
 * @param code
 */
export function updateFromCode(
  code: string,
  controls: Record<string, CodeControl>
) {
  codeShapes.clear()
  ;(window as any).isUpdatingCode = true

  const scope = {
    ...baseScope,
    controls: Object.fromEntries(
      Object.entries(controls).map(([id, control]) => [
        control.label,
        control.value,
      ])
    ),
  }

  new Function(...Object.keys(scope), `${code}`)(...Object.values(scope))

  const generatedShapes = Array.from(codeShapes.values()).map(
    (instance) => instance.shape
  )

  return { shapes: generatedShapes }
}
