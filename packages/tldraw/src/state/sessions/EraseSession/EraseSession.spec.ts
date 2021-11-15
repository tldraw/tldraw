import { mockDocument, TLDrawTestApp } from '~test'
import { TLDrawStatus } from '~types'

describe('Draw session', () => {
  it('begins, updates, completes session', () => {
    const state = new TLDrawTestApp().loadDocument(mockDocument)

    state.selectTool('erase').pointCanvas([300, 300])

    expect(state.status).toBe('pointing')

    state.movePointer([0, 0])

    expect(state.status).toBe('erasing')

    state.stopPointing()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    expect(state.shapes.length).toBe(0)
  })

  it('does, undoes and redoes', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .selectTool('erase')
      .pointCanvas([300, 300])
      .movePointer([0, 0])
      .stopPointing()

    expect(state.shapes.length).toBe(0)

    state.undo()

    expect(state.shapes.length).toBe(3)

    state.redo()

    expect(state.shapes.length).toBe(0)
  })
})
