import * as React from 'react'
import { render } from '@testing-library/react'
import { TLDraw } from './tldraw'

describe('tldraw', () => {
  test('mounts component', () => {
    render(<TLDraw />)
  })
})
