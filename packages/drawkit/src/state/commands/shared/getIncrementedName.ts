/**
 * Get an incremented name (e.g. Page 2) from a name (e.g. Page 1), based on an array of existing names.
 *
 * @param name The name to increment.
 * @param others The array of existing names.
 */
export function getIncrementedName(name: string, others: string[]) {
  let result = name
  const set = new Set(others)

  while (set.has(result)) {
    result = /^.*(\d+)$/.exec(result)?.[1]
      ? result.replace(/(\d+)(?=\D?)$/, (m) => (+m + 1).toString())
      : `${result} 1`
  }

  return result
}
