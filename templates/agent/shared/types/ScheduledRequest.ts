import { BoxModel } from 'tldraw'
import { ContextItem } from './ContextItem'

export interface ScheduledRequest {
	message: string
	type: 'review' | 'setMyView' | 'user' | 'continue'
	contextItems: ContextItem[]
	bounds: BoxModel
}
