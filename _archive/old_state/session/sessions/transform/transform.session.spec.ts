import { TransformSession } from './transform.session'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { TLBoundsCorner, Utils } from '@tldraw/core'
import { getShapeUtils } from '../../../../shape'
import { Data } from '../../../../types'

function getSingleBounds(data: Data) {
  const shape = data.page.shapes['rect1']
  return getShapeUtils(shape).getBounds(shape)
}

function getCommonBounds(data: Data) {
  return Utils.getCommonBounds(
    ['rect1', 'rect2']
      .map((id) => data.page.shapes[id])
      .map((shape) => getShapeUtils(shape).getBounds(shape)),
  )
}

describe('Transform session', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('begins, updates and completes session', () => {
    const tdata = Utils.deepClone(data)
    const session = new TransformSession(tdata, [0, 0], TLBoundsCorner.TopLeft)
    session.update(tdata, [10, 10])
    session.complete(tdata)
  })

  describe('when transforming from the top-left corner', () => {
    it('transforms a single shape', () => {
      const tdata = Utils.deepClone(data)
      const session = new TransformSession(tdata, [0, 0], TLBoundsCorner.TopLeft)
      session.update(tdata, [10, 10])
      session.complete(tdata)

      expect(getSingleBounds(tdata)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 100,
        maxY: 100,
        width: 90,
        height: 90,
      })
    })

    it('transforms a single shape while holding shift', () => {
      const tdata = Utils.deepClone(data)
      const session = new TransformSession(tdata, [0, 0], TLBoundsCorner.TopLeft)
      session.update(tdata, [20, 10], true)
      session.complete(tdata)

      expect(getSingleBounds(tdata)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 100,
        maxY: 100,
        width: 90,
        height: 90,
      })
    })

    it('transforms multiple shapes', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['rect1', 'rect2']
      const session = new TransformSession(tdata, [0, 0], TLBoundsCorner.TopLeft)
      session.update(tdata, [10, 10])
      session.complete(tdata)

      expect(getSingleBounds(tdata)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getCommonBounds(tdata)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 200,
        maxY: 200,
        width: 190,
        height: 190,
      })
    })

    it('transforms multiple shapes while holding shift', () => {
      const tdata = Utils.deepClone(data)
      tdata.pageState.selectedIds = ['rect1', 'rect2']
      const session = new TransformSession(tdata, [0, 0], TLBoundsCorner.TopLeft)
      session.update(tdata, [20, 10], true)
      session.complete(tdata)

      expect(getSingleBounds(tdata)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 105,
        maxY: 105,
        width: 95,
        height: 95,
      })

      expect(getCommonBounds(tdata)).toMatchObject({
        minX: 10,
        minY: 10,
        maxX: 200,
        maxY: 200,
        width: 190,
        height: 190,
      })
    })
  })

  describe('when transforming from the top-right corner', () => {
    // Todo
  })

  describe('when transforming from the bottom-right corner', () => {
    // Todo
  })

  describe('when transforming from the bottom-left corner', () => {
    // Todo
  })

  describe('when transforming from the top edge', () => {
    // Todo
  })

  describe('when transforming from the right edge', () => {
    // Todo
  })

  describe('when transforming from the bottom edge', () => {
    // Todo
  })

  describe('when transforming from the left edge', () => {
    // Todo
  })
})
