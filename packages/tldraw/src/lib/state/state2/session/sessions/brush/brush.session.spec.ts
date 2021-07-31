import { BrushSession } from './brush.session'
import { mockData } from '../../../../../../specs/__mocks__/mock-data'
import { Utils } from '@tldraw/core'

describe('Brush session', () => {
  const data = Utils.deepClone(mockData)

  it('begins, updates and completes session', () => {
    const session = new BrushSession(data, [-10, -10])
    session.update(data, [10, 10])
    session.complete(data)
    expect(data.pageState.selectedIds.length).toBe(1)
  })

  it('selects multiple shapes', () => {
    const session = new BrushSession(data, [-10, -10])
    session.update(data, [110, 110])
    session.complete(data)
    expect(data.pageState.selectedIds.length).toBe(2)
  })

  it('does not de-select original shapes', () => {
    const tdata = Utils.deepClone(data)
    tdata.pageState.selectedIds = ['rect1']
    const session = new BrushSession(tdata, [300, 300])
    session.update(tdata, [301, 301])
    session.complete(tdata)
    expect(tdata.pageState.selectedIds.length).toBe(1)
  })

  it('does not select hidden shapes', () => {
    const tdata = Utils.deepClone(data)
    tdata.pageState.selectedIds = []
    tdata.page.shapes['rect1'].isHidden = true
    const session = new BrushSession(tdata, [-10, -10])
    session.update(tdata, [10, 10])
    session.complete(tdata)
    expect(tdata.pageState.selectedIds.length).toBe(0)
  })
})
