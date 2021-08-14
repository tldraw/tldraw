import * as React from 'react'
import { ContextMenu } from './context-menu'
import { renderWithContext } from '~test'

describe('context menu', () => {
  test('mounts component', () => {
    renderWithContext(
      <ContextMenu>
        <div>Hello</div>
      </ContextMenu>
    )
  })
})
