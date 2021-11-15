import { mockDocument, TLDrawTestApp } from '~test'
import { TLDrawStatus } from '~types'

describe('Grid session', () => {
  it('begins, updateSession', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1')
      .pointShape('rect1', [5, 5])
      .movePointer([10, 10])

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])

    state.completeSession()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])

    state.undo()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])

    state.redo()

    expect(state.getShape('rect1').point).toStrictEqual([5, 5])
  })

  it('cancels session', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .select('rect1', 'rect2')
      .pointBounds([5, 5])
      .movePointer([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
