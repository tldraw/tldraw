import { atom } from 'tldraw'

interface ScheduledRequest {
	message: string
	review: boolean
}

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])
