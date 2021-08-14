import * as React from 'react'
import { renderWithContext } from '~test'
import { StylePanel } from './style-panel'

describe('style panel', () => {
  test('mounts component', () => {
    renderWithContext(<StylePanel />)
  })
})
