/**
 * Makes all properties in a type and all nested properties optional recursively.
 * This is useful for creating partial update objects where you only want to specify
 * some deeply nested properties while leaving others unchanged.
 *
 * @example
 * ```ts
 * interface User {
 *   name: string
 *   settings: {
 *     theme: string
 *     notifications: {
 *       email: boolean
 *       push: boolean
 *     }
 *   }
 * }
 *
 * type PartialUser = RecursivePartial<User>
 * // Result: {
 * //   name?: string
 * //   settings?: {
 * //     theme?: string
 * //     notifications?: {
 * //       email?: boolean
 * //       push?: boolean
 * //     }
 * //   }
 * // }
 *
 * const update: PartialUser = {
 *   settings: {
 *     notifications: {
 *       email: false
 *     }
 *   }
 * }
 * ```
 *
 * @public
 */
export type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>
}

/**
 * Expands a type definition to show its full structure in IDE tooltips and error messages.
 * This utility type forces TypeScript to resolve and display the complete type structure
 * instead of showing complex conditional types or intersections as-is.
 *
 * @example
 * ```ts
 * type User = { name: string }
 * type WithId = { id: string }
 * type UserWithId = User & WithId
 *
 * // Without Expand, IDE shows: User & WithId
 * // With Expand, IDE shows: { name: string; id: string }
 * type ExpandedUserWithId = Expand<UserWithId>
 *
 * // Useful for complex intersections
 * type ComplexType = Expand<BaseType & Mixin1 & Mixin2>
 * ```
 *
 * @public
 */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

/**
 * Makes specified keys in a type required while keeping all other properties as-is.
 * This is useful when you need to ensure certain optional properties are provided
 * in specific contexts without affecting the entire type structure.
 *
 * @example
 * ```ts
 * interface Shape {
 *   id: string
 *   x?: number
 *   y?: number
 *   visible?: boolean
 * }
 *
 * // Make position properties required
 * type PositionedShape = Required<Shape, 'x' | 'y'>
 * // Result: {
 * //   id: string
 * //   x: number      // now required
 * //   y: number      // now required
 * //   visible?: boolean
 * // }
 *
 * const shape: PositionedShape = {
 *   id: 'rect1',
 *   x: 10,    // must provide
 *   y: 20,    // must provide
 *   // visible is still optional
 * }
 * ```
 *
 * @internal
 */
export type Required<T, K extends keyof T> = Expand<Omit<T, K> & { [P in K]-?: T[P] }>

/**
 * Automatically makes properties optional if their type includes `undefined`.
 * This transforms properties like `prop: string | undefined` to `prop?: string | undefined`,
 * making the API more ergonomic by not requiring explicit undefined assignments.
 *
 * @example
 * ```ts
 * interface RawConfig {
 *   name: string
 *   theme: string | undefined
 *   debug: boolean | undefined
 *   version: number
 * }
 *
 * type Config = MakeUndefinedOptional<RawConfig>
 * // Result: {
 * //   name: string
 * //   theme?: string | undefined    // now optional
 * //   debug?: boolean | undefined   // now optional
 * //   version: number
 * // }
 *
 * const config: Config = {
 *   name: 'MyApp',
 *   version: 1
 *   // theme and debug can be omitted instead of explicitly set to undefined
 * }
 * ```
 *
 * @public
 */
export type MakeUndefinedOptional<T extends object> = Expand<
	{
		[P in { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T]]: T[P]
	} & {
		[P in { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]]?: T[P]
	}
>
