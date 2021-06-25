import Rectangle from './rectangle'
import Ellipse from './ellipse'
import Polyline from './polyline'
import Dot from './dot'
import Ray from './ray'
import Line from './line'
import Arrow from './arrow'
import Draw from './draw'
import Utils from './utils'
import Vec from 'utils/vec'
import { NumberControl, VectorControl, codeControls, controls } from './control'
import { codeShapes } from './index'
import {
  CodeControl,
  Data,
  Shape,
  DashStyle,
  ColorStyle,
  SizeStyle,
} from 'types'
import { getPage, getShapes } from 'utils'
import { transform } from 'sucrase'

const baseScope = {
  Dot,
  Ellipse,
  Ray,
  Line,
  Polyline,
  Rectangle,
  Vec,
  Utils,
  Arrow,
  Draw,
  VectorControl,
  NumberControl,
  DashStyle,
  ColorStyle,
  SizeStyle,
}

/**
 * Evaluate code, collecting generated shapes in the shape set. Return the
 * collected shapes as an array.
 * @param code
 */
export async function generateFromCode(
  data: Data,
  code: string
): Promise<{
  shapes: Shape[]
  controls: CodeControl[]
}> {
  codeControls.clear()
  codeShapes.clear()
  ;(window as any).isUpdatingCode = false
  ;(window as any).currentPageId = data.currentPageId

  const { currentPageId } = data
  const scope = { ...baseScope, controls, currentPageId }

  const transformed = transform(code, {
    transforms: ['typescript'],
  }).code

  new Function(...Object.keys(scope), `${transformed}`)(...Object.values(scope))

  const startingChildIndex =
    getShapes(data)
      .filter((shape) => shape.parentId === data.currentPageId)
      .sort((a, b) => a.childIndex - b.childIndex)[0]?.childIndex || 1

  const generatedShapes = Array.from(codeShapes.values())
    .sort((a, b) => a.shape.childIndex - b.shape.childIndex)
    .map((instance, i) => ({
      ...instance.shape,
      isGenerated: true,
      parentId: getPage(data).id,
      childIndex: startingChildIndex + i,
    }))

  const generatedControls = Array.from(codeControls.values())

  return { shapes: generatedShapes, controls: generatedControls }
}

/**
 * Evaluate code, collecting generated shapes in the shape set. Return the
 * collected shapes as an array.
 * @param code
 */
export async function updateFromCode(
  data: Data,
  code: string
): Promise<{
  shapes: Shape[]
}> {
  codeShapes.clear()
  ;(window as any).isUpdatingCode = true
  ;(window as any).currentPageId = data.currentPageId

  const { currentPageId } = data

  const newControls = Object.fromEntries(
    Object.entries(data.codeControls).map(([_, control]) => [
      control.label,
      control.value,
    ])
  )

  const scope = {
    ...baseScope,
    currentPageId,
    controls: newControls,
  }

  const startingChildIndex =
    getShapes(data)
      .filter((shape) => shape.parentId === data.currentPageId)
      .sort((a, b) => a.childIndex - b.childIndex)[0]?.childIndex || 1

  const transformed = transform(code, {
    transforms: ['typescript'],
  }).code

  new Function(...Object.keys(scope), `${transformed}`)(...Object.values(scope))

  const generatedShapes = Array.from(codeShapes.values())
    .sort((a, b) => a.shape.childIndex - b.shape.childIndex)
    .map((instance, i) => ({
      ...instance.shape,
      isGenerated: true,
      parentId: getPage(data).id,
      childIndex: startingChildIndex + i,
    }))

  return { shapes: generatedShapes }
}
