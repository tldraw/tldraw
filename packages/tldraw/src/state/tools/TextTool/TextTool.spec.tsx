/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { TldrawApp } from '~state'
import { TextTool } from '.'
import * as React from 'react'
import { render, waitForElementToBeRemoved, fireEvent, waitFor } from '@testing-library/react'
import { Tldraw } from '~Tldraw'
import type { TextShape } from '~types'

class PointerEvent extends Event {
  constructor(type: string, eventInitDict: PointerEventInit) {
    super(type, eventInitDict)
    Object.entries(eventInitDict).forEach(([k, v]) => {
      try {
        Object.assign(this, { [k]: v })
      } catch (e) {
        // noop
      }
    })
  }
}

describe('TextTool', () => {
  it('creates tool', () => {
    const app = new TldrawApp()
    new TextTool(app)
  })

  test('Creates a text shape.', async () => {
    let app: TldrawApp | undefined
    const onMount = jest.fn((_app: TldrawApp) => (app = _app))
    const wrapper = render(<Tldraw onMount={onMount} />)
    await waitFor(() => onMount)
    if (!app) throw Error('No app!')

    expect(wrapper.queryByTestId('text-shape')).toBeNull()

    const button = wrapper.getByTestId('text')
    const canvas = wrapper.getByTestId('canvas')

    button.click()

    expect(app.status).toBe('idle')
    expect(app.appState.activeTool).toBe('text')

    const event = new PointerEvent('pointerdown', {
      pointerId: 0,
      button: 0,
      bubbles: true,
      clientX: 100,
      clientY: 100,
      pressure: 0.5,
    })

    canvas.dispatchEvent(event)

    expect(app.status).toBe('creating')

    expect(wrapper.getByTestId('text-shape')).not.toBeNull()
  })

  test('Does not delete a text shape if empty if blur comes within 50ms.', async () => {
    let app: TldrawApp | undefined
    const onPatch = jest.fn()
    const onPersist = jest.fn()
    const onMount = jest.fn((_app: TldrawApp) => (app = _app))
    const wrapper = render(<Tldraw onMount={onMount} onPersist={onPersist} onPatch={onPatch} />)
    await waitFor(() => onMount)
    if (!app) throw Error('No app!')

    const button = wrapper.getByTestId('text')
    const canvas = wrapper.getByTestId('canvas')

    button.click()

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 0,
        button: 0,
        bubbles: true,
        clientX: 100,
        clientY: 100,
        pressure: 0.5,
      })
    )

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 0,
        button: 0,
        bubbles: true,
        clientX: 300,
        clientY: 300,
        pressure: 0.5,
      })
    )

    expect(app.status).toBe('idle')
    expect(app.appState.activeTool).toBe('select')
    expect(wrapper.queryByTestId('text-shape'))
  })

  test('Deletes a text shape if empty.', async () => {
    let app: TldrawApp | undefined
    const onPatch = jest.fn()
    const onPersist = jest.fn()
    const onMount = jest.fn((_app: TldrawApp) => (app = _app))
    const wrapper = render(<Tldraw onMount={onMount} onPersist={onPersist} onPatch={onPatch} />)
    await waitFor(() => onMount)
    if (!app) throw Error('No app!')

    expect(wrapper.queryByTestId('text-shape')).toBeNull()

    const button = wrapper.getByTestId('text')
    const canvas = wrapper.getByTestId('canvas')

    button.click()

    expect(app.status).toBe('idle')
    expect(app.appState.activeTool).toBe('text')

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 0,
        button: 0,
        bubbles: true,
        clientX: 100,
        clientY: 100,
        pressure: 0.5,
      })
    )

    expect(app.status).toBe('creating')
    expect(app.appState.activeTool).toBe('text')
    expect(wrapper.getByTestId('text-shape')).not.toBeNull()

    // Wait for the timer to expire
    await new Promise<void>((resolve) =>
      setTimeout(() => {
        resolve()
      }, 50)
    )

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 0,
        button: 0,
        bubbles: true,
        clientX: 300,
        clientY: 300,
        pressure: 0.5,
      })
    )

    expect(app.status).toBe('idle')
    expect(app.appState.activeTool).toBe('select')
    expect(wrapper.queryByTestId('text-shape')).toBeNull()
  })

  test('Saves a text shape after typing.', async () => {
    let app: TldrawApp | undefined
    const onPatch = jest.fn()
    const onMount = jest.fn((_app: TldrawApp) => (app = _app))
    const wrapper = render(<Tldraw onMount={onMount} onPatch={onPatch} />)
    await waitFor(() => onMount)
    if (!app) throw Error('No app!')

    expect(wrapper.queryByTestId('text-shape')).toBeNull()

    const button = wrapper.getByTestId('text')
    const canvas = wrapper.getByTestId('canvas')

    button.click()

    expect(app.status).toBe('idle')
    expect(app.appState.activeTool).toBe('text')

    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerId: 0,
        button: 0,
        bubbles: true,
        clientX: 100,
        clientY: 100,
        pressure: 0.5,
      })
    )

    expect(app.status).toBe('creating')
    expect(app.appState.activeTool).toBe('text')
    expect(wrapper.getByTestId('text-shape')).not.toBeNull()

    const textarea = wrapper.getByTestId('text-shape-area')

    fireEvent.change(textarea, { target: { value: 'hello' } })

    await waitFor(onPatch)

    const shape = app.getShape(app.pageState.editingId!) as TextShape

    expect(shape.text).toBe('hello')
  })
})
