import * as React from 'react'
import { mockDocument } from '+test-utils/mockDocument'
import { mockUtils } from '+test-utils/mockUtils'
import { render } from '@testing-library/react'
import { Renderer } from './renderer'

describe('context menu', () => {
  test('mounts component', () => {
    render(
      <Renderer
        shapeUtils={mockUtils}
        page={mockDocument.page}
        pageState={mockDocument.pageState}
      />
    )
  })
})
