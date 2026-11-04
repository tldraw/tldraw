import { TldrawProviderMetadata } from './components/WhiteboardModal'

/** A chat message as the browser shows and stores it. */
export interface ChatMessage {
	id: string
	role: 'user' | 'assistant'
	parts: ChatPart[]
}

export type ChatPart =
	| { type: 'text'; text: string }
	| {
			type: 'file'
			/** A data URL. */
			url: string
			filename?: string
			mediaType: string
			providerMetadata?: { tldraw?: TldrawProviderMetadata }
	  }
