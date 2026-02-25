import { Editor, TLShape, TLShapeId, createShapeId, toRichText } from 'tldraw'

// Colors for fold ridges
const FOLD_COLORS = [
	'light-blue',
	'blue',
	'violet',
	'light-violet',
	'grey',
	'light-green',
	'green',
	'yellow',
	'orange',
	'red',
] as const

type FoldColor = (typeof FOLD_COLORS)[number]

interface FoldShapes {
	lineId: TLShapeId
	labelId: TLShapeId
	baseY: number
	baseX: number
	baseW: number
}

// A fold represents one historical snapshot
export interface Fold {
	index: number
	y: number
	shapes: FoldShapes
	color: FoldColor
	// Only save user shape records, not the whole store
	savedShapes: TLShape[]
	isUnfolding: boolean
	unfoldProgress: number
}

export interface HistoryState {
	folds: Fold[]
	foldShapeIds: Set<TLShapeId>
	nextFoldIndex: number
	isAnimating: boolean
	unfoldingFold: Fold | null
	animationStartTime: number
}

export function createHistoryState(): HistoryState {
	return {
		folds: [],
		foldShapeIds: new Set(),
		nextFoldIndex: 0,
		isAnimating: false,
		unfoldingFold: null,
		animationStartTime: 0,
	}
}

function getUserShapes(editor: Editor, state: HistoryState): TLShape[] {
	return editor.getCurrentPageShapes().filter((s) => !state.foldShapeIds.has(s.id))
}

const LINE_HEIGHT = 4
const FOLD_PADDING = 40
const FOLD_SPACING = 50
const DEFAULT_WIDTH = 800

export function createFoldRidge(
	editor: Editor,
	state: HistoryState,
	foldIndex: number,
	savedShapes: TLShape[]
): Fold {
	// Position based on content bounds, not viewport
	const userShapes = getUserShapes(editor, state)
	const userIds = userShapes.map((s) => s.id)
	const contentBounds = userIds.length > 0 ? editor.getShapesPageBounds(userIds) : null
	const left = contentBounds ? contentBounds.minX - 50 : -DEFAULT_WIDTH / 2
	const width = contentBounds ? contentBounds.w + 100 : DEFAULT_WIDTH
	const contentBottom = contentBounds ? contentBounds.maxY : 0
	const y = contentBottom + FOLD_PADDING + foldIndex * FOLD_SPACING
	const color = FOLD_COLORS[foldIndex % FOLD_COLORS.length]

	const lineId = createShapeId()
	const labelId = createShapeId()

	editor.run(() => {
		editor.createShape({
			id: lineId,
			type: 'geo',
			x: left,
			y: y - LINE_HEIGHT / 2,
			opacity: 0.7,
			props: {
				geo: 'rectangle',
				w: width,
				h: LINE_HEIGHT,
				color,
				fill: 'solid',
				dash: 'solid',
				size: 's',
			},
		})

		editor.createShape({
			id: labelId,
			type: 'text',
			x: left + 12,
			y: y - 24,
			opacity: 0.6,
			props: {
				richText: toRichText(`fold ${foldIndex + 1}`),
				color,
				size: 's',
			},
		})

		state.foldShapeIds.add(lineId)
		state.foldShapeIds.add(labelId)
	})

	return {
		index: foldIndex,
		y,
		shapes: { lineId, labelId, baseY: y - LINE_HEIGHT / 2, baseX: left, baseW: width },
		color,
		savedShapes,
		isUnfolding: false,
		unfoldProgress: 0,
	}
}

export function recordFold(editor: Editor, state: HistoryState): void {
	if (state.isAnimating) return

	const userShapes = getUserShapes(editor, state)
	if (userShapes.length === 0 && state.folds.length === 0) return

	// Deep copy the current user shapes as the snapshot
	const savedShapes = userShapes.map((s) => structuredClone(s))

	const fold = createFoldRidge(editor, state, state.nextFoldIndex, savedShapes)
	state.folds.push(fold)
	state.nextFoldIndex++
}

export function startUnfold(editor: Editor, state: HistoryState, fold: Fold): void {
	if (state.isAnimating) return

	state.isAnimating = true
	state.unfoldingFold = fold
	state.animationStartTime = Date.now()
	fold.isUnfolding = true
	fold.unfoldProgress = 0
}

const UNFOLD_DURATION = 800

export function tickUnfold(editor: Editor, state: HistoryState): void {
	if (!state.isAnimating || !state.unfoldingFold) return

	const elapsed = Date.now() - state.animationStartTime
	const t = Math.min(elapsed / UNFOLD_DURATION, 1)
	const eased = 1 - Math.pow(1 - t, 3)

	const fold = state.unfoldingFold

	editor.run(() => {
		const scaleH = 1 + eased * 20
		const opacity = 0.7 * (1 - eased * 0.9)

		editor.updateShape({
			id: fold.shapes.lineId,
			type: 'geo',
			y: fold.shapes.baseY - (LINE_HEIGHT * scaleH) / 2,
			opacity,
			props: { h: LINE_HEIGHT * scaleH },
		})

		editor.updateShape({
			id: fold.shapes.labelId,
			type: 'text',
			opacity: 0.6 * (1 - eased),
		})

		const foldIdx = state.folds.indexOf(fold)
		for (let i = foldIdx + 1; i < state.folds.length; i++) {
			const laterFold = state.folds[i]
			const laterOpacity = 0.7 * (1 - eased * 0.95)
			editor.updateShape({
				id: laterFold.shapes.lineId,
				type: 'geo',
				opacity: laterOpacity,
			})
			editor.updateShape({
				id: laterFold.shapes.labelId,
				type: 'text',
				opacity: laterOpacity,
			})
		}
	})

	if (t >= 1) {
		finishUnfold(editor, state)
	}
}

function finishUnfold(editor: Editor, state: HistoryState): void {
	const fold = state.unfoldingFold
	if (!fold) return

	const foldIdx = state.folds.indexOf(fold)

	// Collect fold shape IDs to remove (this fold and later ones)
	const foldIdsToRemove: TLShapeId[] = []
	for (let i = foldIdx; i < state.folds.length; i++) {
		const f = state.folds[i]
		foldIdsToRemove.push(f.shapes.lineId, f.shapes.labelId)
		state.foldShapeIds.delete(f.shapes.lineId)
		state.foldShapeIds.delete(f.shapes.labelId)
	}

	// Delete current user shapes + fold shapes being removed
	const currentUserIds = getUserShapes(editor, state).map((s) => s.id)

	editor.run(() => {
		editor.deleteShapes([...foldIdsToRemove, ...currentUserIds])
		// Restore the saved user shapes from the fold snapshot
		editor.createShapes(fold.savedShapes)
	})

	// Trim folds to only those before the unfolded one
	state.folds = state.folds.slice(0, foldIdx)
	state.nextFoldIndex = foldIdx

	state.isAnimating = false
	state.unfoldingFold = null

	editor.selectNone()
}

export function getFoldForShape(state: HistoryState, shapeId: TLShapeId): Fold | undefined {
	for (const fold of state.folds) {
		if (fold.shapes.lineId === shapeId || fold.shapes.labelId === shapeId) {
			return fold
		}
	}
	return undefined
}
