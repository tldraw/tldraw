import * as React from 'react'
import { ContextMenu } from './ContextMenu'
import { renderWithContext, renderWithIntlProvider } from '~test'

describe('context menu', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      renderWithIntlProvider(
        <ContextMenu onBlur={jest.fn()}>
          <div>Hello</div>
        </ContextMenu>
      )
    )
  })
})
