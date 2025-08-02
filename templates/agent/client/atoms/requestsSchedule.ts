import { atom } from 'tldraw'
import { ScheduledRequest } from '../types/ScheduledRequest'

export const $requestsSchedule = atom<ScheduledRequest[]>('requestsSchedule', [])
