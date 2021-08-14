import * as React from 'react'
import { mockUtils, renderWithSvg } from '+test-utils'
import { Shape } from './shape'

describe('handles', () => {
  test('mounts component', () => {
    renderWithSvg(
      <Shape
        shape={mockUtils.box.create({})}
        isEditing={false}
        isBinding={false}
        isDarkMode={false}
        isCurrentParent={false}
      />
    )
  })
})
