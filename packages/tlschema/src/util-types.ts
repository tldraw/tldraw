/**
 * Utility type that extracts the value type from a Set type.
 *
 * This helper type uses conditional type inference to extract the element type
 * from a Set. It's useful when working with sets in type definitions where you
 * need to reference the type of elements contained within the set.
 *
 * The type uses TypeScript's `infer` keyword to capture the generic parameter
 * of the Set type, making it reusable across different Set types.
 *
 * @example
 * ```ts
 * import { SetValue } from '@tldraw/tlschema'
 *
 * // Extract value type from a Set type
 * type StringSet = Set<string>
 * type StringValue = SetValue<StringSet> // string
 *
 * type NumberSet = Set<number>
 * type NumberValue = SetValue<NumberSet> // number
 * ```
 *
 * @example
 * ```ts
 * // Usage with const sets
 * const COLORS = new Set(['red', 'green', 'blue'] as const)
 * type ColorSet = typeof COLORS
 * type Color = SetValue<ColorSet> // 'red' | 'green' | 'blue'
 *
 * // Function that accepts set values
 * function processColor(color: SetValue<typeof COLORS>) {
 *   // color is typed as 'red' | 'green' | 'blue'
 *   console.log(`Processing color: ${color}`)
 * }
 * ```
 *
 * @example
 * ```ts
 * // Complex usage with union types
 * const UI_COLORS = new Set(['selection-stroke', 'accent', 'muted'])
 * type UIColorSet = typeof UI_COLORS
 * type UIColor = SetValue<UIColorSet> // 'selection-stroke' | 'accent' | 'muted'
 *
 * // Validate color is in set
 * function isValidUIColor(color: string): color is UIColor {
 *   return UI_COLORS.has(color)
 * }
 * ```
 *
 * @public
 */
export type SetValue<T extends Set<any>> = T extends Set<infer U> ? U : never
