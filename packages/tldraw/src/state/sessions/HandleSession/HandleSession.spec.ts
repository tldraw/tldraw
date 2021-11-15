import { mockDocument, TLDrawTestApp } from '~test'
import { SessionType, TLDrawShapeType, TLDrawStatus } from '~types'

describe('Handle session', () => {
  it('begins, updateSession', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        id: 'arrow1',
        type: TLDrawShapeType.Arrow,
      })
      .select('arrow1')
      .movePointer([-10, -10])
      .startSession(SessionType.Arrow, 'arrow1', 'end')
      .movePointer([10, 10])
      .completeSession()

    expect(state.appState.status).toBe(TLDrawStatus.Idle)

    state.undo().redo()
  })

  it('cancels session', () => {
    const state = new TLDrawTestApp()
      .loadDocument(mockDocument)
      .createShapes({
        type: TLDrawShapeType.Arrow,
        id: 'arrow1',
      })
      .select('arrow1')
      .movePointer([-10, -10])
      .startSession(SessionType.Arrow, 'arrow1', 'end')
      .movePointer([10, 10])
      .cancelSession()

    expect(state.getShape('rect1').point).toStrictEqual([0, 0])
  })
})
