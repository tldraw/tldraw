import { UIMessage, validateUIMessages } from 'ai'
import { useCallback, useEffect, useState } from 'react'
import { FileHelpers } from 'tldraw'

const STORAGE_FILE_NAME = 'chat-messages.json'

/**
 * Store chat messages locally in the browser. We use the origin private file system API to store
 * the messages because it has a higher capacity than localStorage, and is easier to use than
 * IndexedDB.
 */
export function useChatMessageStorage(): [UIMessage[] | null, (messages: UIMessage[]) => void] {
	const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null)

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

				const messages = JSON.parse(fileContents)
				const validatedMessages = await validateUIMessages({ messages })
				if (isCancelled) return

				setInitialMessages(validatedMessages)
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

	const saveMessages = useCallback(async (messages: UIMessage[]) => {
		const root = await navigator.storage.getDirectory()
		const file = await root.getFileHandle(STORAGE_FILE_NAME, { create: true })
		const writable = await file.createWritable({ keepExistingData: false })
		const text = JSON.stringify(messages)
		await writable.write(text)
		await writable.close()
	}, [])

	return [initialMessages, saveMessages] as const
}
