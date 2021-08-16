import * as React from 'react'
import { ContextMenu } from './context-menu'
import { renderWithContext } from '~test'

describe('context menu', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <ContextMenu>
        <div>Hello</div>
      </ContextMenu>
    )
  })
})
