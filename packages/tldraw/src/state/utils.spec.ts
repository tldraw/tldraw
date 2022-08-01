import { safeMerge } from './utils'

describe('safeMerge', () => {
  test('ignores undefined source values', () => {
    expect(safeMerge({ a: 1, b: 2 }, { a: undefined })).toEqual({ a: 1, b: 2 })
  })

  test('replaces target values with source values', () => {
    expect(safeMerge({ a: 1, b: 2 }, { a: 3, b: 4 })).toEqual({ a: 3, b: 4 })
  })

  test('replaces target arrays with source arrays', () => {
    expect(safeMerge({ a: [1] }, { a: [2] })).toEqual({ a: [2] })
  })

  test('merges nested objects', () => {
    expect(safeMerge({ a: { b: 1 } }, { a: { b: 2 } })).toEqual({ a: { b: 2 } })
  })

  test('ignores nested undefined source values', () => {
    expect(safeMerge({ a: { b: 1, c: 2 } }, { a: { b: undefined } })).toEqual({ a: { b: 1, c: 2 } })
  })

  test('replaces nested target arrays with source arrays', () => {
    expect(safeMerge({ a: { b: [1] } }, { a: { b: [2] } })).toEqual({ a: { b: [2] } })
  })
})
