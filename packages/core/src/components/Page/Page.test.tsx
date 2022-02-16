import * as React from 'react'
import { mockDocument, renderWithContext } from '~test'
import { Page } from './Page'

describe('page', () => {
  test('mounts component without crashing', () => {
    renderWithContext(
      <Page
        page={mockDocument.page}
        pageState={mockDocument.pageState}
        assets={{}}
        hideBounds={false}
        hideIndicators={false}
        hideHandles={false}
        hideBindingHandles={false}
        hideCloneHandles={false}
        hideRotateHandle={false}
        hideResizeHandles={false}
      />
    )
  })
})
