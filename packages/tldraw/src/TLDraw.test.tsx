import * as React from 'react'
import { render } from '@testing-library/react'
import { TLDraw } from './TLDraw'

describe('tldraw', () => {
  test('mounts component without crashing', () => {
    render(<TLDraw />)
  })

  test('mounts component and calls onMount', (done) => {
    const onMount = jest.fn()
    render(<TLDraw onMount={onMount} />)
    // The call is asynchronous: it won't be called until the next tick.
    setTimeout(() => {
      expect(onMount).toHaveBeenCalled()
      done()
    }, 100)
  })

  test('mounts component and calls onMount when id is present', (done) => {
    const onMount = jest.fn()
    render(<TLDraw id="someId" onMount={onMount} />)
    // The call is asynchronous: it won't be called until the next tick.
    setTimeout(() => {
      expect(onMount).toHaveBeenCalled()
      done()
    }, 100)
  })
})
