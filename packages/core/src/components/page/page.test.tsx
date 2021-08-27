import * as React from 'react'
import { mockDocument, renderWithContext } from '+test'
import { Page } from './page'

describe('page', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <Page
        page={mockDocument.page}
        pageState={mockDocument.pageState}
        hideBounds={false}
        hideIndicators={false}
        hideHandles={false}
        isDarkMode={false}
      />
    )
  })
})
