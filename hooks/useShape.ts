/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useSelector } from 'state'
import { getShapeUtils } from 'state/shape-utils'
import tld from 'utils/tld'

export default function useShapeDef(id: string) {
  return useSelector(
    (s) => tld.getShape(s.data, id),
    (prev, next) => {
      const shouldSkip = !(
        prev &&
        next &&
        next !== prev &&
        getShapeUtils(next).shouldRender(next, prev)
      )

      return shouldSkip
    }
  )
}
