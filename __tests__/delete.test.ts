import state from 'state'
import inputs from 'state/inputs'
import { getShape } from 'utils'
import { idsAreSelected, point, rectangleId } from './test-utils'
import * as json from './__mocks__/document.json'

state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })

describe('selection', () => {
  it('deletes a shape and undoes the delete', () => {
    state
      .send('CANCELED')
      .send('POINTED_SHAPE', inputs.pointerDown(point(), rectangleId))
      .send('STOPPED_POINTING', inputs.pointerUp(point(), rectangleId))
      .send('DELETED')

    expect(getShape(state.data, rectangleId)).toBe(undefined)
    expect(idsAreSelected(state.data, [])).toBe(true)

    state.send('UNDO')

    expect(getShape(state.data, rectangleId)).toBeTruthy()
    expect(idsAreSelected(state.data, [rectangleId])).toBe(true)

    state.send('REDO')

    expect(getShape(state.data, rectangleId)).toBe(undefined)
    expect(idsAreSelected(state.data, [])).toBe(true)
  })
})
