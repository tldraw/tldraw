import { HtmlCssShape } from './end-to-end'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		html: HtmlCssShape
	}
}
