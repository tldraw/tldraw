/** @public */
export type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>
}

/** @public */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

type _Required<T> = { [K in keyof T]-?: T[K] }

/** @internal */
export type Required<T, K extends keyof T> = Expand<Omit<T, K> & _Required<Pick<T, K>>>
