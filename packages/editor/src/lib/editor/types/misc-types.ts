/** @public */
export type RequiredKeys<T, K extends keyof T> = Pick<T, K> & Partial<T>
/** @public */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
