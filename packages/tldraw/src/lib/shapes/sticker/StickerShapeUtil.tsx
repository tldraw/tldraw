import {
	BaseBoxShapeUtil,
	HTMLContainer,
	TLStickerShape,
	stickerShapeMigrations,
	stickerShapeProps,
} from '@tldraw/editor'

/** @public */
export class StickerShapeUtil extends BaseBoxShapeUtil<TLStickerShape> {
	static override type = 'sticker' as const
	static override props = stickerShapeProps
	static override migrations = stickerShapeMigrations

	override getDefaultProps(): TLStickerShape['props'] {
		return { w: 48, h: 48, emoji: '❤️' }
	}

	override isStickerLike(): boolean {
		return true
	}

	override isAspectRatioLocked(): boolean {
		return true
	}

	override canResize(): boolean {
		return true
	}

	override component(shape: TLStickerShape) {
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					fontSize: Math.min(shape.props.w, shape.props.h) * 0.8,
					lineHeight: 1,
					userSelect: 'none',
					pointerEvents: 'all',
				}}
			>
				{shape.props.emoji}
			</HTMLContainer>
		)
	}

	override indicator(shape: TLStickerShape) {
		return (
			<rect
				width={shape.props.w}
				height={shape.props.h}
				rx={4}
				ry={4}
			/>
		)
	}
}
