export type KeyForType<U, T> = {
	[K in keyof U]: U[K] extends T ? K : never
}[keyof U]
