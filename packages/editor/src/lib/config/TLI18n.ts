/** @public */
export interface TLI18n {
	locale: string
	dir: 'ltr' | 'rtl'
	translate(key: string, ...args: any[]): string
}

/** @public */
export type TLI18nAdapter = () => TLI18n

/** @public */
export function defaultI18n(): TLI18n {
	return {
		locale: 'en',
		dir: 'ltr',
		translate(key: string) {
			return key
		},
	}
}
