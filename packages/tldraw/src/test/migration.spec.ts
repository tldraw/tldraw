/* eslint-disable @typescript-eslint/ban-ts-comment */
import { TLDrawState } from '~state'
import type { TLDrawDocument } from '~types'
import oldDoc from './old-doc'

describe('When migrating bindings', () => {
  it('migrates', () => {
    Object.values((oldDoc as unknown as TLDrawDocument).pages).forEach((page) => {
      Object.values(page.bindings).forEach((binding) => {
        if ('meta' in binding) {
          // @ts-ignore
          Object.assign(binding, binding.meta)
        }
      })
    })

    new TLDrawState().loadDocument(oldDoc as unknown as TLDrawDocument)
  })
})
