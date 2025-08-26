import { atom } from 'tldraw'
import { ScheduledRequest } from '../../shared/types/ScheduledRequest'

export const $scheduledRequests = atom<ScheduledRequest[]>('scheduledRequests', [])
