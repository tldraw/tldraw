import state from 'state'
import * as json from './__mocks__/document.json'

state.reset()
state.send('MOUNTED').send('LOADED_FROM_FILE', { json: JSON.stringify(json) })
state.send('CLEARED_PAGE')

describe('transforms shapes', () => {
  it('transforms from the top edge', () => {
    // TODO
    null
  })

  it('transforms from the right edge', () => {
    // TODO
    null
  })

  it('transforms from the bottom edge', () => {
    // TODO
    null
  })

  it('transforms from the left edge', () => {
    // TODO
    null
  })

  it('transforms from the top-left corner', () => {
    // TODO
    null
  })

  it('transforms from the top-right corner', () => {
    // TODO
    null
  })

  it('transforms from the bottom-right corner', () => {
    // TODO
    null
  })

  it('transforms from the bottom-left corner', () => {
    // TODO
    null
  })
})

describe('transforms shapes while aspect-ratio locked', () => {
  // Fixed

  it('transforms from the top edge while aspect-ratio locked', () => {
    // TODO
    null
  })

  it('transforms from the right edge while aspect-ratio locked', () => {
    // TODO
    null
  })

  it('transforms from the bottom edge while aspect-ratio locked', () => {
    // TODO
    null
  })
  it('transforms from the left edge while aspect-ratio locked', () => {
    // TODO
    null
  })

  it('transforms from the top-left corner while aspect-ratio locked', () => {
    // TODO
    null
  })

  it('transforms from the top-right corner while aspect-ratio locked', () => {
    // TODO
    null
  })

  it('transforms from the bottom-right corner while aspect-ratio locked', () => {
    // TODO
    null
  })

  it('transforms from the bottom-left corner while aspect-ratio locked', () => {
    // TODO
    null
  })
})
