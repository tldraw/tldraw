import * as React from 'react'
import { mockUtils, renderWithSvg } from '+test'
import { Shape } from './shape'

describe('shape', () => {
  test('mounts component without crashing', () => {
    renderWithSvg(
      <Shape
        shape={mockUtils.box.create({})}
        utils={mockUtils[mockUtils.box.type]}
        isEditing={false}
        isBinding={false}
        isHovered={false}
        isSelected={false}
        isCurrentParent={false}
      />
    )
  })
})
