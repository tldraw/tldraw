import * as React from 'react'
import { Menu } from './menu'
import { renderWithContext } from '~test'

describe('menu', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<Menu />)
  })
})
