import { useSelector } from 'state'
import { getShapeUtils } from 'state/shape-utils'
import { deepCompareArrays } from 'utils'
import tld from 'utils/tld'

export default function useShapesToRender(): string[] {
  return useSelector(
    (s) =>
      Object.values(tld.getPage(s.data).shapes)
        .filter((shape) => shape && !getShapeUtils(shape).isForeignObject)
        .map((shape) => shape.id),
    deepCompareArrays
  )
}
