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
		imageName?: string
	} | null
	isDragging: boolean
}

type ChatInputAction =
	/** Updates the text input value */
	| { type: 'setInput'; input: string }
	/** Adds or updates an image in the chat input */
	| { type: 'setImage'; image: WhiteboardImage }
	/** Removes an image from the chat input by its ID */
	| { type: 'removeImage'; imageId: string }
	/** Clears all input data (text, images, modals) */
	| { type: 'clear' }
	/** Opens the whiteboard modal for drawing/editing */
	| {
			type: 'openWhiteboard'
			snapshot?: TLEditorSnapshot
			id?: string
			uploadedFile?: File
			imageName?: string
	  }
	/** Closes the whiteboard modal */
	| { type: 'closeWhiteboard' }
	/** Indicates a file is being dragged over the input area */
	| { type: 'dragEnter' }
	/** Indicates drag operation has left the input area */
	| { type: 'dragLeave' }
	/** Handles dropping an image file to open in whiteboard */
	| { type: 'drop'; file: File }

function chatInputReducer(state: ChatInputState, action: ChatInputAction): ChatInputState {
	switch (action.type) {
		case 'setInput':
			return { ...state, input: action.input }
		case 'setImage': {
			const index = state.images.findIndex((img) => img.id === action.image.id)
			if (index !== -1) {
				const newImages = [...state.images]
				newImages[index] = action.image
				return { ...state, images: newImages }
			}
			return { ...state, images: [...state.images, action.image] }
		}
		case 'removeImage':
			return { ...state, images: state.images.filter((img) => img.id !== action.imageId) }
		case 'clear':
			return {
				input: '',
				images: [],
				openWhiteboard: null,
				isDragging: false,
			}
		case 'openWhiteboard':
			return {
				...state,
				openWhiteboard: {
					snapshot: action.snapshot,
					id: action.id,
					uploadedFile: action.uploadedFile,
					imageName: action.imageName,
				},
				isDragging: false,
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

/**
 * Hook for managing chat input state including text, images, whiteboard modal, and drag/drop interactions.
 *
 * Handles:
 * - Text input value
 * - Whiteboard images attached to the message
 * - Whiteboard modal state for drawing/editing
 * - Drag and drop file upload interactions
 *
 * @returns A tuple containing the current state and dispatch function for actions
 */
export function useChatInputState(): [ChatInputState, React.Dispatch<ChatInputAction>] {
	const [state, dispatch] = useReducer(chatInputReducer, {
		input: '',
		images: [],
		openWhiteboard: null,
		isDragging: false,
	})

	return [state, dispatch]
}
