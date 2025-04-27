/** @public */
export type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial
}

/** @public */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

/** @internal */
export type Required<T, K extends keyof T> = Expand

/** @public */
export type MakeUndefinedOptional<T extends object> = Expand
