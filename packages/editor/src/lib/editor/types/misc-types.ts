/** @public */
export type RequiredKeys<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>
/** @public */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type TLTextInjectionSite = {
  justify: 'left' | 'center' | 'right'
  align: 'top' | 'center' | 'bottom'
  x: number
  y: number
}