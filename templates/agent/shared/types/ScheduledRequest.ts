import { BoxModel } from 'tldraw'
import { IContextItem } from './ContextItem'

export interface ScheduledRequest {
	message: string
	type: 'review' | 'setMyView' | 'user' | 'continue'
	contextItems: IContextItem[]
	bounds: BoxModel
}
