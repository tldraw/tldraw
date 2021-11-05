/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TLDrawState } from '~state'
import type { TLDrawDocument } from '~types'
import oldDoc from './old-doc'
import oldDoc2 from './old-doc-2'

describe('When migrating bindings', () => {
  it('migrates', () => {
    // Object.values((oldDoc as unknown as TLDrawDocument).pages).forEach((page) => {
    //   Object.values(page.bindings).forEach((binding) => {
    //     if ('meta' in binding) {
    //       // @ts-ignore
    //       Object.assign(binding, binding.meta)
    //     }
    //   })
    // })

    new TLDrawState().loadDocument(oldDoc as unknown as TLDrawDocument)
  })

  it('migrates older document', () => {
    // Object.values((oldDoc as unknown as TLDrawDocument).pages).forEach((page) => {
    //   Object.values(page.bindings).forEach((binding) => {
    //     if ('meta' in binding) {
    //       // @ts-ignore
    //       Object.assign(binding, binding.meta)
    //     }
    //   })
    // })

    const tlstate = new TLDrawState().loadDocument(oldDoc2 as unknown as TLDrawDocument)

    expect(tlstate.getShape('d7ab0a49-3cb3-43ae-3d83-f5cf2f4a510a').style.color).toBe('black')
  })
})
