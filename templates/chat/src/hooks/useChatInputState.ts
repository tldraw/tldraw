import { useReducer } from 'react'
import { TLEditorSnapshot } from 'tldraw'
import { WhiteboardImage } from '../components/WhiteboardModal'

interface OpenWhiteboard {
	snapshot?: TLEditorSnapshot
	id?: string
	uploadedFile?: File
	imageName?: string
}

interface ChatInputState {
	input: string
	images: WhiteboardImage[]
	openWhiteboard: OpenWhiteboard | null
	isDragging: boolean
}

type ChatInputAction =
	| { type: 'setInput'; input: string }
	| { type: 'setImage'; image: WhiteboardImage }
	| { type: 'removeImage'; imageId: string }
	| { type: 'clear' }
	| ({ type: 'openWhiteboard' } & OpenWhiteboard)
	| { type: 'closeWhiteboard' }
	| { type: 'dragEnter' }
	| { type: 'dragLeave' }
	| { type: 'drop'; file: File }

const initialState: ChatInputState = {
	input: '',
	images: [],
	openWhiteboard: null,
	isDragging: false,
}

function chatInputReducer(state: ChatInputState, action: ChatInputAction): ChatInputState {
	switch (action.type) {
		case 'setInput':
			return { ...state, input: action.input }
		case 'setImage': {
			const exists = state.images.some((img) => img.id === action.image.id)
			return {
				...state,
				images: exists
					? state.images.map((img) => (img.id === action.image.id ? action.image : img))
					: [...state.images, action.image],
			}
		}
		case 'removeImage':
			return { ...state, images: state.images.filter((img) => img.id !== action.imageId) }
		case 'clear':
			return initialState
		case 'openWhiteboard': {
			const { snapshot, id, uploadedFile, imageName } = action
			return {
				...state,
				openWhiteboard: { snapshot, id, uploadedFile, imageName },
				isDragging: false,
			}
		}
		case 'closeWhiteboard':
			return { ...state, openWhiteboard: null }
		case 'dragEnter':
			return { ...state, isDragging: true }
		case 'dragLeave':
			return { ...state, isDragging: false }
		case 'drop':
			return {
				...state,
				isDragging: false,
				openWhiteboard: { uploadedFile: action.file, imageName: action.file.name },
			}
		default:
			return state
	}
}

/** Text input, attached whiteboard images, whiteboard modal state, and drag/drop state for the chat input. */
export function useChatInputState(): [ChatInputState, React.Dispatch<ChatInputAction>] {
	return useReducer(chatInputReducer, initialState)
}
