import { SpeechBubbleShape } from './SpeechBubbleUtil'

declare module '@tldraw/tlschema' {
	export interface GlobalShapePropsMap {
		'speech-bubble': SpeechBubbleShape
	}
}
