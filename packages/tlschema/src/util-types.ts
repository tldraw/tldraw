/** @public */
export type SetValue<T extends Set> = T extends Set ? U : never
