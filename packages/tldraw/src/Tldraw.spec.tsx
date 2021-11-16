import * as React from 'react'
import { render, waitFor } from '@testing-library/react'
import { Tldraw } from './Tldraw'

describe('Tldraw', () => {
  test('mounts component and calls onMount', async () => {
    const onMount = jest.fn()
    render(<Tldraw onMount={onMount} />)
    await waitFor(onMount)
  })

  test('mounts component and calls onMount when id is present', async () => {
    const onMount = jest.fn()
    render(<Tldraw id="someId" onMount={onMount} />)
    await waitFor(onMount)
  })
})
