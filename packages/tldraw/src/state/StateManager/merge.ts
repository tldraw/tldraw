import type { Patch } from './types'

/**
 * Recursively merge an object with a deep partial of the same type.
 * @param target The original complete object.
 * @param patch The deep partial to merge with the original object.
 */

export function merge<T>(target: T, patch: Patch<T>): T {
  const result: T = { ...target }

  const entries = Object.entries(patch) as [keyof T, T[keyof T]][]

  for (const [key, value] of entries)
    result[key] =
      value === Object(value) && !Array.isArray(value)
        ? merge(result[key], value)
        : value

  return result
}
