import { FrameShapeUtil, TLFrameShape, TLShape, Vec } from 'tldraw'

/**
 * Photobook-style frames: `meta.role` controls which levels call `getClipPath`.
 * Working spread: only `spread` clips. Broken spread: spread + page + template + layout clip.
 */
export class RoleFrameShapeUtil extends FrameShapeUtil {
	static override type = 'frame' as const

	override getClipPath(shape: TLFrameShape): Vec[] | undefined {
		const role = shape.meta?.role
		if (typeof role !== 'string') return undefined

		if (role === 'spread') return super.getClipPath(shape)

		if (
			role === 'broken-spread' ||
			role === 'broken-page' ||
			role === 'broken-template' ||
			role === 'broken-layout' ||
			role === 'broken-placeholder'
		) {
			return super.getClipPath(shape)
		}

		return undefined
	}

	override shouldClipChild(child: TLShape): boolean {
		if (child.type === 'image' && this.editor.getCroppingShapeId() === child.id) {
			return false
		}
		return true
	}
}
