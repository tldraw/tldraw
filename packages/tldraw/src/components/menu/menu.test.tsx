import * as React from 'react'
import { Menu } from './menu'
import { mockDocument, renderWithContext } from '~test'

describe('menu menu', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<Menu />)
  })
})
