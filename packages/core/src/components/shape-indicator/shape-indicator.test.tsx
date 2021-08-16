import * as React from 'react'
import { mockUtils, renderWithSvg } from '+test'
import { ShapeIndicator } from './shape-indicator'

describe('shape indicator', () => {
  test('mounts component without crashing', () => {
    renderWithSvg(<ShapeIndicator shape={mockUtils.box.create({})} variant={'selected'} />)
  })
})
