import state from 'state'
import * as json from './__mocks__/document.json'

state.reset()
state
  .send('MOUNTED')
  .send('MOUNTED_SHAPES')
  .send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

describe('shape styles', () => {
  it('sets the color style of a shape', () => {
    // TODO
    null
  })

  it('sets the size style of a shape', () => {
    // TODO
    null
  })

  it('sets the dash style of a shape', () => {
    // TODO
    null
  })

  it('sets the isFilled style of a shape', () => {
    // TODO
    null
  })
})
