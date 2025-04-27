/** @public */
export type SetValue<T extends Set<any>> = T extends Set<infer U> ? U : never
