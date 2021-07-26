import { TemplateSession } from './template.session'
import { mockData } from '../../../../../specs/__mocks__/mock-data'
import { Utils } from '@tldraw/core'

describe('Brush session', () => {
  const data = Utils.deepClone(mockData)

  it('begins, updates and completes session', () => {
    const session = new TemplateSession(data, [-10, -10])
    session.update(data, [10, 10])
    session.complete(data)
  })
})
