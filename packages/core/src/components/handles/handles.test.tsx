import * as React from 'react'
import { mockUtils, renderWithContext } from '+test'
import { Handles } from './handles'

describe('handles', () => {
  test('mounts component', () => {
    renderWithContext(<Handles zoom={1} shape={mockUtils.box.create({})} />)
  })
})
