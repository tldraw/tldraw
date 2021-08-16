import * as React from 'react'
import { PagePanel } from './page-panel'
import { renderWithContext } from '~test'

describe('page panel', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<PagePanel />)
  })
})
