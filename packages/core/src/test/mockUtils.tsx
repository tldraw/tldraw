import type { TLShapeUtils } from '+types'
import { Box, BoxShape } from './box'

export const mockUtils: TLShapeUtils<BoxShape, SVGGElement> = {
  box: new Box(),
}
