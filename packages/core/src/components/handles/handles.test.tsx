import * as React from 'react'
import { mockUtils, renderWithContext } from '+test'
import { Handles } from './handles'

describe('handles', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<Handles shape={mockUtils.box.create({ id: 'box' })} />)
  })
})
