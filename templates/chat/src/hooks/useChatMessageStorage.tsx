import { useCallback, useEffect, useState } from 'react'
import { FileHelpers } from 'tldraw'
import type { ChatMessage } from '@/types'

const STORAGE_FILE_NAME = 'chat-messages.json'

/**
 * Store chat messages locally in the browser. We use the origin private file system API to store
 * the messages because it has a higher capacity than localStorage, and is easier to use than
 * IndexedDB.
 */
export function useChatMessageStorage(): [ChatMessage[] | null, (messages: ChatMessage[]) => void] {
	const [initialMessages, setInitialMessages] = useState<ChatMessage[] | null>(null)

	useEffect(() => {
		let isCancelled = false
		;(async () => {
			try {
				const root = await navigator.storage.getDirectory()
				if (isCancelled) return

				const file = await root.getFileHandle(STORAGE_FILE_NAME)
				if (isCancelled) return

				const fileContents = await FileHelpers.blobToText(await file.getFile())
				if (isCancelled) return

				setInitialMessages(JSON.parse(fileContents))
			} catch (err) {
				if (isCancelled) return
				console.error('Error loading chat messages from storage', err)
				setInitialMessages([])
			}
		})()

		return () => {
			isCancelled = true
		}
	}, [])

	const saveMessages = useCallback(async (messages: ChatMessage[]) => {
		const root = await navigator.storage.getDirectory()
		const file = await root.getFileHandle(STORAGE_FILE_NAME, { create: true })
		const writable = await file.createWritable({ keepExistingData: false })
		await writable.write(JSON.stringify(messages))
		await writable.close()
	}, [])

	return [initialMessages, saveMessages]
}
