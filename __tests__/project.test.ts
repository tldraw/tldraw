import * as json from './__mocks__/document.json'
import state from 'state'
import { point } from './test-utils'
import inputs from 'state/inputs'
import { getSelectedIds, setToArray } from 'utils/utils'

const rectangleId = '1f6c251c-e12e-40b4-8dd2-c1847d80b72f'
const arrowId = '5ca167d7-54de-47c9-aa8f-86affa25e44d'

describe('project', () => {
  it('mounts the state', () => {
    state.enableLog(true)

    state
      .send('MOUNTED')
      .send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
  })

  it('selects and deselects a shape', () => {
    expect(setToArray(getSelectedIds(state.data))).toStrictEqual([])

    state
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point()))

    expect(setToArray(getSelectedIds(state.data))).toStrictEqual([rectangleId])

    state
      .send('POINTED_CANVAS', inputs.pointerDown(point(), 'canvas'))
      .send('STOPPED_POINTING', inputs.pointerUp(point()))

    expect(setToArray(getSelectedIds(state.data))).toStrictEqual([])
  })

  it('selects multiple shapes', () => {
    expect(setToArray(getSelectedIds(state.data))).toStrictEqual([])

    state
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point()))

    expect(setToArray(getSelectedIds(state.data))).toStrictEqual([rectangleId])

    state.send(
      'POINTED_SHAPE',
      inputs.pointerDown(point({ shiftKey: true }), arrowId)
    )

    // state.send('STOPPED_POINTING', inputs.pointerUp(point()))

    expect(setToArray(getSelectedIds(state.data))).toStrictEqual([
      rectangleId,
      arrowId,
    ])
  })
})
