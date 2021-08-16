import * as React from 'react'
import { PageOptionsDialog } from './page-options-dialog'
import { mockDocument, renderWithContext } from '~test'

describe('page options dialog', () => {
  test('mounts component without crashing', () => {
    renderWithContext(<PageOptionsDialog page={mockDocument.pages.page1} />)
  })
})
