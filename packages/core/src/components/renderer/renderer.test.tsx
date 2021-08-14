import * as React from 'react'
import { mockDocument, mockUtils } from '+test'
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
