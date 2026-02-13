import { XIcon } from './icons/XIcon'
import { WhiteboardImage } from './WhiteboardModal'

interface ChatInputImageProps {
	image: WhiteboardImage
	onRemove: () => void
	onEdit: () => void
}

export function ChatInputImage({ image, onRemove, onEdit }: ChatInputImageProps) {
	return (
		<div className="input-image">
			{/* the whole image is a clickable area that opens the whiteboard modal. */}
			<button type="button" className="input-image-edit" onClick={onEdit} aria-label="Edit image">
				<img src={image.url} alt="Uploaded image" className="input-image-preview" />
			</button>
			{/* a button to remove the image is positioned over the top of it. */}
			<button
				type="button"
				className="input-image-remove"
				onClick={onRemove}
				aria-label="Remove image"
			>
				<XIcon />
			</button>
		</div>
	)
}
