import { DrawSession } from './draw.session'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { Utils } from '@tldraw/core'
import { ColorStyle, DashStyle, SizeStyle, TLDrawShapeType } from 'packages/tldraw/src/lib/shape'

describe('Brush session', () => {
  const data = Utils.deepClone(mockData)
  data.page.shapes['draw1'] = {
    id: 'rect1',
    parentId: 'page1',
    name: 'Rectangle',
    childIndex: 0,
    type: TLDrawShapeType.Draw,
    point: [32, 32],
    points: [[0, 0]],
    style: {
      dash: DashStyle.Draw,
      size: SizeStyle.Medium,
      color: ColorStyle.Blue,
    },
  }

  it('begins, updates and completes session', () => {
    const session = new DrawSession(data, 'draw1', [-10, -10])
    session.update(data, [10, 10], 0.5, false)
    session.complete(data)
  })
})
