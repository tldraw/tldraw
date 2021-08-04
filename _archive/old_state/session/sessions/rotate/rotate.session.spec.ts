import { RotateSession } from './rotate.session'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { Utils } from '@tldraw/core'

describe('Brush session', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('begins, updates and completes session', () => {
    const session = new RotateSession(data, [0, 0])
    session.update(data, [200, 200])
    session.complete(data)
  })

  it('rotates the shape', () => {
    const tdata = Utils.deepClone(data)
    const session = new RotateSession(tdata, [0, 0])
    session.update(tdata, [200, 200])
    expect(tdata.page.shapes.rect1.rotation).toBe(Math.PI * 2)
    session.complete(tdata)
  })
})
