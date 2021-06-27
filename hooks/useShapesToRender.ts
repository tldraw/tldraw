import { useSelector } from 'state'
import { getShapeUtils } from 'state/shape-utils'
import { deepCompareArrays, getPage } from 'utils'

export default function useShapesToRender(): string[] {
  return useSelector(
    (s) =>
      Object.values(getPage(s.data).shapes)
        .filter((shape) => shape && !getShapeUtils(shape).isForeignObject)
        .map((shape) => shape.id),
    deepCompareArrays
  )
}
