import * as React from 'react'
import { mockUtils, renderWithSvg } from '+test'
import { Shape } from './shape'

describe('handles', () => {
  test('mounts component without crashing', () => {
    renderWithSvg(
      <Shape
        shape={mockUtils.box.create({})}
        isEditing={false}
        isBinding={false}
        isCurrentParent={false}
      />
    )
  })
})
