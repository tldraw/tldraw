import { atom } from 'tldraw'
import { AgentRequest } from '../../shared/types/AgentRequest'

export const $scheduledRequest = atom<AgentRequest | null>('scheduledRequest', null)
