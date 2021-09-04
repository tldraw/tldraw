import * as React from 'react'
import { ToolsPanel } from './tools-panel'
import { renderWithContext } from '~test'

describe('tools panel', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<ToolsPanel />)
  })
})
