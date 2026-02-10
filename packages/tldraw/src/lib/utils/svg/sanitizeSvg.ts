import DOMPurify from 'dompurify'

/** @internal */
export function defaultSanitizeSvg(svgText: string): string {
	return DOMPurify.sanitize(svgText, {
		USE_PROFILES: { svg: true, svgFilters: true },
		ADD_TAGS: ['use'],
		ADD_ATTR: ['xlink:href'],
	})
}
