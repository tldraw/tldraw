import { atom } from 'tldraw'
import { ContextItem } from './Context'

export interface ScheduledRequest {
	message: string
	review: boolean
	contextItems: ContextItem[]
	// bounds?: {
	// 	x: number
	// 	y: number
	// 	w: number
	// 	h: number
	// }
}

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])
