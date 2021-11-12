import { TLDrawState } from '~state'
import { mockDocument, TLDrawStateUtils } from '~test'
import { SessionType, TLDrawShapeType } from '~types'
import { EraseTool } from './EraseTool'

describe('EraseTool', () => {
  it('creates tool', () => {
    const state = new TLDrawState()
    new EraseTool(state)
  })
})
