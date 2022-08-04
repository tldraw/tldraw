import * as React from 'react'
import { ToolsPanel } from './ToolsPanel'
import { renderWithContext, renderWithIntlProvider } from '~test'

describe('tools panel', () => {
  test('mounts component without crashing', () => {
    renderWithContext(renderWithIntlProvider(<ToolsPanel onBlur={() => void null} />))
  })
})
