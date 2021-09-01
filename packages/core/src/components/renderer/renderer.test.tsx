import * as React from 'react'
import { mockDocument, mockUtils } from '+test'
import { render } from '@testing-library/react'
import { Renderer } from './renderer'

describe('renderer', () => {
  test('mounts component without crashing', () => {
    render(
      <Renderer
        shapeUtils={mockUtils}
        page={mockDocument.page}
        pageState={mockDocument.pageState}
      />
    )
  })
})
