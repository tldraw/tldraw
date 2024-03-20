import { VecLike } from '@tldraw/editor'
import { canonicalStickers, constructDataUriSticker } from './stickers'

export default function StickerWheel({
	point,
	onSelect,
}: {
	point: VecLike
	onSelect: (stickerKey: keyof typeof canonicalStickers) => void
}) {
	const handleStickerClick = (stickerKey: keyof typeof canonicalStickers) => {
		onSelect(stickerKey)
	}

	return (
		<div className="tl-sticker-wheel" style={{ top: point.y, left: point.x }}>
			{Object.entries(canonicalStickers).map(([stickerKey], i) => (
				<button
					key={stickerKey}
					className="tl-sticker-wheel-sticker"
					onClick={() => handleStickerClick(stickerKey as keyof typeof canonicalStickers)}
					style={{
						// @ts-ignore shhh
						'--rotation': `${i * 60}deg`,
					}}
				>
					<img src={constructDataUriSticker(stickerKey as keyof typeof canonicalStickers, 48)} />
				</button>
			))}
		</div>
	)
}
