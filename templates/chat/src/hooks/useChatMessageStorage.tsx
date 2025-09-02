import { UIMessage } from 'ai'
import { noop } from 'tldraw'

export function useChatMessageStorage(): [UIMessage[] | null, (messages: UIMessage[]) => void] {
	// const [initialMessages, setInitialMessages] = useState<UIMessage[] | null>(null)

	// useEffect(() => {
	// 	let isCancelled = false
	// 	;(async () => {
	// 		try {
	// 			const messages = JSON.parse(localStorage.getItem('chat-messages') || '[]')
	// 			const validatedMessages = await validateUIMessages({ messages })
	// 			if (isCancelled) return
	// 			setInitialMessages(validatedMessages)
	// 		} catch (err) {
	// 			if (isCancelled) return
	// 			console.error('Error parsing chat messages from local storage', err)
	// 			setInitialMessages([])
	// 		}
	// 	})()

	// 	return () => {
	// 		isCancelled = true
	// 	}
	// }, [])

	// const saveMessages = useCallback((messages: UIMessage[]) => {
	// 	localStorage.setItem('chat-messages', JSON.stringify(messages))
	// }, [])

	// return [initialMessages, saveMessages] as const

	// disabled for now:
	return [[], noop]
}
