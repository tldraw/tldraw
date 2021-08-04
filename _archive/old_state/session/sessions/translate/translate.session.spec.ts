import { TranslateSession } from './translate.session'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { Utils } from '@tldraw/core'

describe('Translate session', () => {
  const data = Utils.deepClone(mockData)

  it('begins, updates and completes session', () => {
    const session = new TranslateSession(data, [-10, -10])
    session.update(data, [10, 10])
    session.complete(data)
  })

  it('moves a single shape', () => {
    const tdata = Utils.deepClone(data)
    tdata.pageState.selectedIds = ['rect1']
    const session = new TranslateSession(tdata, [10, 10])
    session.update(tdata, [20, 20])
    session.complete(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([10, 10])
  })

  it('moves a single shape along a locked axis', () => {
    const tdata = Utils.deepClone(data)
    tdata.pageState.selectedIds = ['rect1']
    const session = new TranslateSession(tdata, [10, 10])
    session.update(tdata, [20, 20], true)
    session.complete(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([10, 0])
  })

  it('moves two shapes', () => {
    const tdata = Utils.deepClone(data)
    tdata.pageState.selectedIds = ['rect1', 'rect2']
    const session = new TranslateSession(tdata, [10, 10])
    session.update(tdata, [20, 20])
    session.complete(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([10, 10])
    expect(tdata.page.shapes['rect2'].point).toEqual([110, 110])
  })

  it('clones shapes', () => {
    const tdata = Utils.deepClone(data)
    tdata.pageState.selectedIds = ['rect1', 'rect2']
    const session = new TranslateSession(tdata, [10, 10])
    session.update(tdata, [20, 20], false, true)
    session.complete(tdata)

    expect(tdata.page.shapes['rect1'].point).toEqual([0, 0])
    expect(tdata.page.shapes['rect2'].point).toEqual([100, 100])

    expect(Object.keys(tdata.page.shapes).length).toBe(4)
  })

  it('destroys clones when last update is not cloning', () => {
    const tdata = Utils.deepClone(data)
    tdata.pageState.selectedIds = ['rect1', 'rect2']
    const session = new TranslateSession(tdata, [10, 10])
    session.update(tdata, [20, 20], false, true)
    session.update(tdata, [30, 30], false, false)
    session.complete(tdata)

    // Original position + delta
    expect(tdata.page.shapes['rect1'].point).toEqual([30, 30])
    expect(tdata.page.shapes['rect2'].point).toEqual([130, 130])

    expect(Object.keys(tdata.page.shapes).length).toBe(2)
  })

  it('clones a shape with a parent shape', () => {
    // TODO
  })

  it('clones a shape with children', () => {
    // TODO
  })
})
