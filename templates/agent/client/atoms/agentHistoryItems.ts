import { atom } from 'tldraw'
import { AgentHistoryItem } from '../../shared/types/AgentHistoryItem'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'

export const $agentHistoryItems = atom<AgentHistoryItem[]>('agentHistoryItems', [])

persistAtomInLocalStorage($agentHistoryItems, 'agent-history-items')
