import { EditIcon } from './icons/EditIcon'
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
			<img src={image.url} alt="Uploaded image" className="input-image-preview" />
			<div className="input-image-actions">
				<button type="button" className="input-image-action" onClick={onEdit}>
					<EditIcon />
				</button>
				<button type="button" className="input-image-action" onClick={onRemove}>
					<XIcon />
				</button>
			</div>
		</div>
	)
}
