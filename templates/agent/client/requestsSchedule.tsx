import { atom } from 'tldraw'

interface AgentRequest {
	message: string
	review: boolean
}

export const $requestsSchedule = atom<AgentRequest[]>('requestsSchedule', [])
