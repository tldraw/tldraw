import * as React from 'react'
import { boxShape } from '~TLShapeUtil/TLShapeUtil.spec'
import { renderWithSvg } from '~test'
import { ShapeIndicator } from './ShapeIndicator'

describe('shape indicator', () => {
  test('mounts component without crashing', () => {
    renderWithSvg(
      <ShapeIndicator
        shape={boxShape}
        isSelected={true}
        isHovered={false}
        isEditing={false}
        meta={undefined}
      />
    )
  })
})
