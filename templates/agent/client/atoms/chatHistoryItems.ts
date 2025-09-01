import { atom } from 'tldraw'
import { IChatHistoryItem } from '../../shared/types/ChatHistoryItem'
import { persistAtomInLocalStorage } from './persistAtomInLocalStorage'

export const $chatHistoryItems = atom<IChatHistoryItem[]>('chatHistoryItems', [])

persistAtomInLocalStorage($chatHistoryItems, 'chat-history-items')
