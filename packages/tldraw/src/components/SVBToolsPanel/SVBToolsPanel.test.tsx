import * as React from 'react'
import { renderWithContext, renderWithIntlProvider } from '~test'
import { SVBToolsPanel } from './SVBToolsPanel'

describe('tools panel', () => {
  test('mounts component without crashing', () => {
    renderWithContext(renderWithIntlProvider(<SVBToolsPanel onBlur={() => void null} />))
  })
})
