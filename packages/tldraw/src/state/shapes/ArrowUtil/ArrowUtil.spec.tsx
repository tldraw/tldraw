import Vec from '@tldraw/vec'
import { TldrawTestApp } from '~test'
import { ArrowShape, SessionType, TDShapeType } from '~types'
import { Arrow } from '..'

describe('Arrow shape', () => {
  it('Creates a shape', () => {
    expect(Arrow.create({ id: 'arrow' })).toMatchSnapshot('arrow')
  })
})

describe('When the arrow has a label...', () => {
  it("Positions a straight arrow's label in the center of the bounding box", () => {
    const app = new TldrawTestApp()
      .resetDocument()
      .createShapes(
        { type: TDShapeType.Rectangle, id: 'target1', point: [0, 0], size: [100, 100] },
        { type: TDShapeType.Arrow, id: 'arrow1', point: [200, 200] }
      )
      .select('arrow1')
      .movePointer([200, 200])
      .startSession(SessionType.Arrow, 'arrow1', 'start')
      .movePointer([55, 55])
    expect(app.bindings[0]).toMatchObject({
      fromId: 'arrow1',
      toId: 'target1',
      point: [0.5, 0.5],
    })
    function getOffset() {
      const shape = app.getShape<ArrowShape>('arrow1')
      const bounds = Arrow.getBounds(shape)
      const offset = Vec.sub(
        shape.handles.bend.point,
        Vec.toFixed([bounds.width / 2, bounds.height / 2])
      )
      return offset
    }
    expect(getOffset()).toMatchObject([0, 0])
    app.select('target1')
    app.nudge([0, 1])
    expect(getOffset()).toMatchObject([0, 0])
  })
})
