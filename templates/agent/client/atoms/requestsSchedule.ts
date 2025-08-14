import { atom } from 'tldraw'
import { ScheduledRequest } from '../../shared/types/ScheduledRequest'

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])
