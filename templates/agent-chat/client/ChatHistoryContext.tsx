import React, { createContext, ReactNode, useContext, useState } from 'react'
import {
	AgentActionHistoryItem,
	AgentChangeHistoryItem,
	AgentMessageHistoryItem,
	ChatHistoryItem,
	UserMessageHistoryItem,
} from './ChatHistoryItem'

interface ChatHistoryContextType {
	historyItems: ChatHistoryItem[]
	setHistoryItems: React.Dispatch<React.SetStateAction<ChatHistoryItem[]>>
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined)

export function ChatHistoryProvider({ children }: { children: ReactNode }) {
	const [historyItems, setHistoryItems] = useState<ChatHistoryItem[]>([])

	return (
		<ChatHistoryContext.Provider value={{ historyItems, setHistoryItems }}>
			{children}
		</ChatHistoryContext.Provider>
	)
}

export function useChatHistory(): [
	ChatHistoryItem[],
	React.Dispatch<React.SetStateAction<ChatHistoryItem[]>>,
] {
	const context = useContext(ChatHistoryContext)
	if (context === undefined) {
		throw new Error('useChatHistory must be used within a ChatHistoryProvider')
	}
	return [context.historyItems, context.setHistoryItems]
}

export type {
	AgentActionHistoryItem,
	AgentChangeHistoryItem,
	AgentMessageHistoryItem,
	ChatHistoryItem,
	UserMessageHistoryItem,
}
