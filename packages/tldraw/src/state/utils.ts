/**
 * Deeply merge two objects together, ignoring `undefined` values in `source`.
 */
export const safeMerge = <T, U>(target: T, source: U): T => {
  const entries = Object.entries(source) as [keyof T, U[keyof U]][]
  return entries.reduce((acc, [key, value]) => {
    // if value is undefined, keep target value
    if (value === undefined) {
      return acc
    }

    // if value and target value are objects, merge them
    if (
      Object.prototype.toString.call(value) === '[object Object]' &&
      Object.prototype.toString.call(target[key]) === '[object Object]'
    ) {
      return {
        ...acc,
        [key]: safeMerge(target[key], value),
      }
    }

    // otherwise, use the source value
    return {
      ...acc,
      [key]: value,
    }
  }, target)
}
