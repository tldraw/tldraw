import { Editor, TLAssetId, TLShapeId } from 'tldraw'
import { AssetVerdict, AssetVersion, MARKETING_ASSET_TYPE, MarketingAssetShape } from './assetShape'

/**
 * The asset-record seam: every read and write of a marketing-asset shape's props
 * goes through here, so the record's invariants live in one place rather than spread
 * across the generation pipeline and the shape's component.
 *
 * The invariants:
 * - the Version timeline is append-only — a render adds a version, it never edits or
 *   drops one (`pushVersion`);
 * - reverting is non-destructive — it only moves the "current" pointer, in bounds
 *   (`revertTo`);
 * - status is a small state machine — idle ⇄ generating → (idle | error) — and the
 *   generating heartbeat is cleared on every exit from it.
 */

// --- reads ---

/** Every marketing-asset shape on the current page. */
export function getAssetShapes(editor: Editor): MarketingAssetShape[] {
	return editor
		.getCurrentPageShapes()
		.filter((s): s is MarketingAssetShape => s.type === MARKETING_ASSET_TYPE)
}

/** The version currently shown, if any. */
export function getCurrentVersion(shape: MarketingAssetShape): AssetVersion | undefined {
	return shape.props.versions[shape.props.currentVersion]
}

/** The stored image URL of a version, if the asset record still resolves. */
export function getAssetSrc(editor: Editor, version: AssetVersion): string | undefined {
	const asset = editor.getAsset(version.assetId as TLAssetId)
	const src = (asset?.props as { src?: string | null } | undefined)?.src
	return typeof src === 'string' ? src : undefined
}

// --- writes ---

/** Append a new version and show it; clears the generating state. Append-only. */
export function pushVersion(editor: Editor, id: TLShapeId, version: AssetVersion): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape) return
	const versions = [...shape.props.versions, version]
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: {
			versions,
			currentVersion: versions.length - 1,
			status: 'idle',
			error: '',
			generatingStartedAt: 0,
		},
	})
}

/** Enter the generating state and stamp the heartbeat. */
export function markGenerating(editor: Editor, id: TLShapeId, now: number): void {
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: { status: 'generating', error: '', generatingStartedAt: now },
	})
}

/** Enter the error state with a message; clears the heartbeat. */
export function markFailed(editor: Editor, id: TLShapeId, e: unknown): void {
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: {
			status: 'error',
			error: e instanceof Error ? e.message : 'Something went wrong',
			generatingStartedAt: 0,
		},
	})
}

/** Refresh the heartbeat of a still-generating asset; a no-op otherwise. */
export function refreshHeartbeat(editor: Editor, id: TLShapeId, now: number): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape || shape.props.status !== 'generating') return
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: { generatingStartedAt: now },
	})
}

/**
 * Recover an asset whose generation was abandoned: if it's been generating with no
 * heartbeat for longer than `staleMs`, return it to idle (or to error if it never
 * produced a version). Active renders keep their heartbeat fresh, so they're spared.
 */
export function recoverIfStale(
	editor: Editor,
	shape: MarketingAssetShape,
	now: number,
	staleMs: number
): void {
	if (shape.props.status !== 'generating') return
	if (now - shape.props.generatingStartedAt < staleMs) return
	editor.updateShape<MarketingAssetShape>({
		id: shape.id,
		type: MARKETING_ASSET_TYPE,
		props: shape.props.versions.length
			? { status: 'idle', error: '', generatingStartedAt: 0 }
			: { status: 'error', error: 'Generation was interrupted', generatingStartedAt: 0 },
	})
}

/** Set (or clear) the like/dislike verdict on an asset. */
export function setVerdict(editor: Editor, id: TLShapeId, verdict: AssetVerdict): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape) return
	editor.updateShape<MarketingAssetShape>({ id, type: MARKETING_ASSET_TYPE, props: { verdict } })
}

/** Point the asset at an earlier version, non-destructively and in bounds. */
export function revertTo(editor: Editor, id: TLShapeId, index: number): void {
	const shape = editor.getShape<MarketingAssetShape>(id)
	if (!shape || index < 0 || index >= shape.props.versions.length) return
	editor.updateShape<MarketingAssetShape>({
		id,
		type: MARKETING_ASSET_TYPE,
		props: { currentVersion: index },
	})
}
