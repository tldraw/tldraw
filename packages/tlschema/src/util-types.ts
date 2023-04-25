/** @public */
export type SmooshedUnionObject<T> = {
	[K in T extends infer P ? keyof P : never]: T extends infer P
		? K extends keyof P
			? P[K]
			: never
		: never
}

/** @public */
export type SetValue<T extends Set<any>> = T extends Set<infer U> ? U : never
