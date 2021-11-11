import * as React from 'react'
import { ContextMenu } from './ContextMenu'
import { renderWithContext } from '~test'

describe('context menu', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <ContextMenu onBlur={jest.fn()}>
        <div>Hello</div>
      </ContextMenu>
    )
  })
})
