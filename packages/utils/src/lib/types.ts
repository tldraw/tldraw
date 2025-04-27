/** @public */
export type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>
}

/** @public */
export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never

/** @internal */
export type Required<T, K extends keyof T> = Expand<Omit<T, K> & { [P in K]-?: T[P] }>

/** @public */
export type MakeUndefinedOptional<T extends object> = Expand<
	{
		[P in { [K in keyof T]: undefined extends T[K] ? never : K }[keyof T]]: T[P]
	} & {
		[P in { [K in keyof T]: undefined extends T[K] ? K : never }[keyof T]]?: T[P]
	}
>
