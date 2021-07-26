import { TransformSingleSession } from './transform-single.session'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { TLBoundsCorner, Utils } from '@tldraw/core'

describe('Transform single session', () => {
  const data = Utils.deepClone(mockData)
  data.pageState.selectedIds = ['rect1']

  it('begins, updates and completes session', () => {
    const session = new TransformSingleSession(
      data,
      TLBoundsCorner.TopLeft,
      [-10, -10]
    )
    session.update(data, [10, 10])
    session.complete(data)
  })
})
