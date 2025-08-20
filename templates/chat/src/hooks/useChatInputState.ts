import { useReducer } from 'react'
import { TLEditorSnapshot } from 'tldraw'
import { WhiteboardImage } from '../components/WhiteboardModal'

interface ChatInputState {
	input: string
	images: WhiteboardImage[]
	openWhiteboard: {
		snapshot?: TLEditorSnapshot
		id?: string
		uploadedFile?: File
	} | null
	isDragging: boolean
}

type ChatInputAction =
	| { type: 'SET_INPUT'; payload: string }
	| { type: 'SET_IMAGE'; payload: WhiteboardImage }
	| { type: 'REMOVE_IMAGE'; payload: string }
	| { type: 'CLEAR' }
	| {
			type: 'OPEN_WHITEBOARD'
			payload: {
				snapshot?: TLEditorSnapshot
				id?: string
				uploadedFile?: File
			}
	  }
	| { type: 'CLOSE_WHITEBOARD' }
	| { type: 'DRAG_ENTER' }
	| { type: 'DRAG_LEAVE' }
	| { type: 'DROP'; payload: File }

function chatInputReducer(state: ChatInputState, action: ChatInputAction): ChatInputState {
	switch (action.type) {
		case 'SET_INPUT':
			return { ...state, input: action.payload }
		case 'SET_IMAGE': {
			const index = state.images.findIndex((img) => img.id === action.payload.id)
			if (index !== -1) {
				const newImages = [...state.images]
				newImages[index] = action.payload
				return { ...state, images: newImages }
			}
			return { ...state, images: [...state.images, action.payload] }
		}
		case 'REMOVE_IMAGE':
			return { ...state, images: state.images.filter((img) => img.id !== action.payload) }
		case 'CLEAR':
			return { input: '', images: [], openWhiteboard: null, isDragging: false }
		case 'OPEN_WHITEBOARD':
			return { ...state, openWhiteboard: action.payload, isDragging: false }
		case 'CLOSE_WHITEBOARD':
			return { ...state, openWhiteboard: null }
		case 'DRAG_ENTER':
			return { ...state, isDragging: true }
		case 'DRAG_LEAVE':
			return { ...state, isDragging: false }
		case 'DROP':
			return {
				...state,
				isDragging: false,
				openWhiteboard: { uploadedFile: action.payload },
			}
		default:
			return state
	}
}

export function useChatInputState(): [ChatInputState, React.Dispatch<ChatInputAction>] {
	const [state, dispatch] = useReducer(chatInputReducer, {
		input: '',
		images: [],
		openWhiteboard: null,
		isDragging: false,
	})

	return [state, dispatch]
}
