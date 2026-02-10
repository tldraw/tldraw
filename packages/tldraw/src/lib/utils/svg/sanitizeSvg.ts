import DOMPurify from 'dompurify'

/** @internal */
export type SvgSanitizer = (svgText: string) => string

/** @internal */
export function defaultSanitizeSvg(svgText: string): string {
	return DOMPurify.sanitize(svgText, {
		USE_PROFILES: { svg: true },
		ADD_TAGS: ['use'],
		ADD_ATTR: ['xlink:href'],
	})
}
