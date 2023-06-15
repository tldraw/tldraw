/** @internal */
export type RecursivePartial<T> = {
	[P in keyof T]?: RecursivePartial<T[P]>
}

/** @internal */
export type Identity<T> = { [K in keyof T]: T[K] }

type _Required<T> = { [K in keyof T]-?: T[K] }

/** @internal */
export type Required<T, K extends keyof T> = Identity<Omit<T, K> & _Required<Pick<T, K>>>
