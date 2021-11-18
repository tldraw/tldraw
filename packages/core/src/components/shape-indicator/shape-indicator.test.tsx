import * as React from 'react'
import { renderWithSvg } from '~test'
import { ShapeIndicator } from './shape-indicator'
import { boxShape } from '~shape-utils/TLShapeUtil.spec'

describe('shape indicator', () => {
  test('mounts component without crashing', () => {
    renderWithSvg(
      <ShapeIndicator shape={boxShape} isSelected={true} isHovered={false} meta={undefined} />
    )
  })
})
