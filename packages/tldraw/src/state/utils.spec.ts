import { Utils } from '@tldraw/core'

describe('deep merge', () => {
  it('merges an object', () => {
    const a = { a: 1, b: 2 }
    const b = { ...a, a: 2 }
    const c = Utils.deepMerge(a, b)
    expect(c.a).toBe(2)
    expect(c.b).toBe(a.b)
  })

  it('merges a complex object', () => {
    const a = { a: 1, b: { name: 'steve', age: 93 } }
    const b = { a: 2 }
    const c = Utils.deepMerge<typeof a>(a, b)
    expect(c.a).toBe(2)
    expect(c.b === a.b).toBeTruthy()
  })
})
