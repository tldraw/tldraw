import state from 'state'
import inputs from 'state/inputs'
import { idsAreSelected, point, rectangleId, arrowId } from './test-utils'
import * as json from './__mocks__/document.json'

// Mount the state and load the test file from json
state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })

describe('selection', () => {
  it('selects a shape', () => {
    state
      .send('CANCELED')
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))

    expect(idsAreSelected(state.data, [rectangleId])).toBe(true)
  })

  it('selects and deselects a shape', () => {
    state
      .send('CANCELED')
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))

    expect(idsAreSelected(state.data, [rectangleId])).toBe(true)

    state
      .send('POINTED_CANVAS', inputs.pointerDown(point(), 'canvas'))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), 'canvas'))

    expect(idsAreSelected(state.data, [])).toBe(true)
  })

  it('selects multiple shapes', () => {
    expect(idsAreSelected(state.data, [])).toBe(true)

    state
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(point({ shiftKey: true }), arrowId)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(point({ shiftKey: true }), arrowId)
      )

    expect(idsAreSelected(state.data, [rectangleId, arrowId])).toBe(true)
  })

  it('shift-selects to deselect shapes', () => {
    state
      .send('CANCELLED')
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(point({ shiftKey: true }), arrowId)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(point({ shiftKey: true }), arrowId)
      )
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(point({ shiftKey: true }), rectangleId)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(point({ shiftKey: true }), rectangleId)
      )

    expect(idsAreSelected(state.data, [arrowId])).toBe(true)
  })

  it('single-selects shape in selection on pointerup', () => {
    state
      .send('CANCELLED')
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(point({ shiftKey: true }), arrowId)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(point({ shiftKey: true }), arrowId)
      )

    expect(idsAreSelected(state.data, [rectangleId, arrowId])).toBe(true)

    state.send('POINTED_SHAPE', inputs.pointerDown(point(), arrowId))

    expect(idsAreSelected(state.data, [rectangleId, arrowId])).toBe(true)

    state.send('STOPPED_POINTING', inputs.pointerUp(point(), arrowId))

    expect(idsAreSelected(state.data, [arrowId])).toBe(true)
  })

  it('selects shapes if shift key is lifted before pointerup', () => {
    state
      .send('CANCELLED')
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(point({ shiftKey: true }), arrowId)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(point({ shiftKey: true }), arrowId)
      )
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(point({ shiftKey: true }), arrowId)
      )
      .send('STOPPED_POINTING', inputs.pointerUp(point(), arrowId))

    expect(idsAreSelected(state.data, [arrowId])).toBe(true)
  })

  it('does not select on meta-click', () => {
    state
      .send('CANCELLED')
      .send(
        'POINTED_SHAPE',
        inputs.pointerDown(point({ ctrlKey: true }), rectangleId)
      )
      .send(
        'STOPPED_POINTING',
        inputs.pointerUp(point({ ctrlKey: true }), rectangleId)
      )

    expect(idsAreSelected(state.data, [])).toBe(true)
  })
})
