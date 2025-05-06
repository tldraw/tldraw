/** @public */
export interface TLI18n {
	locale: string
	dir: 'ltr' | 'rtl'
	translate(...args: any[]): string
}

/** @public*/
export type TLI18nAdapter = () => TLI18n

/** @public */
export const defaultI18n = () =>
	({
		locale: 'en',
		dir: 'ltr',
		translate: (key: string) => {
			return key
		},
	}) as TLI18n
