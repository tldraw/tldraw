import * as React from 'react'
import { ToolsPanel } from './ToolsPanel'
import { renderWithContext } from '~test'

describe('tools panel', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<ToolsPanel onBlur={() => void null} />)
  })
})
