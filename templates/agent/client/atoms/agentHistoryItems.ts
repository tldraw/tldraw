import { atom } from 'tldraw'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'

export const $agentHistoryItems = atom<IChatHistoryItem[]>('agentHistoryItems', [])

persistAtomInLocalStorage($agentHistoryItems, 'agent-history-items')
