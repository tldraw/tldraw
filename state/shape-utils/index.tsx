import { Shape, ShapeType, ShapeByType, ShapeUtility } from 'types'
import circle from './circle'
import dot from './dot'
import polyline from './polyline'
import rectangle from './rectangle'
import ellipse from './ellipse'
import line from './line'
import ray from './ray'
import draw from './draw'
import arrow from './arrow'
import group from './group'
import text from './text'

// A mapping of shape types to shape utilities.
const shapeUtilityMap: Record<ShapeType, ShapeUtility<Shape>> = {
  [ShapeType.Circle]: circle,
  [ShapeType.Dot]: dot,
  [ShapeType.Polyline]: polyline,
  [ShapeType.Rectangle]: rectangle,
  [ShapeType.Ellipse]: ellipse,
  [ShapeType.Line]: line,
  [ShapeType.Ray]: ray,
  [ShapeType.Draw]: draw,
  [ShapeType.Arrow]: arrow,
  [ShapeType.Text]: text,
  [ShapeType.Group]: group,
}

/**
 * A helper to retrieve a shape utility based on a shape object.
 * @param shape
 * @returns
 */
export function getShapeUtils<T extends Shape>(shape: T): ShapeUtility<T> {
  return shapeUtilityMap[shape?.type] as ShapeUtility<T>
}

export function createShape<T extends ShapeType>(
  type: T,
  props: Partial<ShapeByType<T>>
): ShapeByType<T> {
  return shapeUtilityMap[type].create(props) as ShapeByType<T>
}

export default shapeUtilityMap
