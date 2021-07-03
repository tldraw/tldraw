/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { useSelector } from 'state'
import { getShapeUtils } from 'state/shape-utils'
import tld from 'utils/tld'

export default function useShape(id: string) {
  return useSelector(
    (s) => tld.getShape(s.data, id),
    (prev, next) =>
      !(
        prev &&
        next &&
        next !== prev &&
        getShapeUtils(next).shouldRender(next, prev)
      )
  )
}
