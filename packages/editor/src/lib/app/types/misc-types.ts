/** @public */
export type RequiredKeys<T, K extends keyof T> = Pick<T, K> & Partial<T>
