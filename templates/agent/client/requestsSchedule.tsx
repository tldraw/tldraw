import { atom } from 'tldraw'
import { ContextItem } from './Context'

interface ScheduledRequest {
	message: string
	review: boolean
	contextItems: ContextItem[]
}

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])
