import * as React from 'react'
import { render, waitFor } from '@testing-library/react'
import { TLDraw } from './TLDraw'

describe('tldraw', () => {
  test('mounts component and calls onMount', async () => {
    const onMount = jest.fn()
    render(<TLDraw onMount={onMount} />)
    await waitFor(onMount)
  })

  test('mounts component and calls onMount when id is present', async () => {
    const onMount = jest.fn()
    render(<TLDraw id="someId" onMount={onMount} />)
    await waitFor(onMount)
  })
})
