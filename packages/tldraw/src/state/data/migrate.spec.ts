import type { TLDrawDocument } from '~types'
import { TLDrawApp } from '~state'
import oldDoc from '~test/documents/old-doc'
import oldDoc2 from '~test/documents/old-doc-2'

describe('When migrating bindings', () => {
  it('migrates a document without a version', () => {
    new TLDrawApp().loadDocument(oldDoc as unknown as TLDrawDocument)
  })

  it('migrates a document with an older version', () => {
    const state = new TLDrawApp().loadDocument(oldDoc2 as unknown as TLDrawDocument)
    expect(state.getShape('d7ab0a49-3cb3-43ae-3d83-f5cf2f4a510a').style.color).toBe('black')
  })
})
