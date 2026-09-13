import { Editor, TLShape } from 'tldraw'
import { MidiEngine, SequenceConfig } from './engine/MidiEngine'
import { ChainShape, getChainMemberIds } from './shapes/ChainShapeUtil'
import { SequenceShape } from './shapes/SequenceShapeUtil'
import { CHAIN_TYPE, SEQUENCE_TYPE, toNextAction, toTrigMode } from './shapes/shared'

const DEFAULT_BPM = 120

// Tempo lives in the document's meta so it saves into the .tldr song and
// persists, without needing a dedicated shape.
export function getSongBpm(editor: Editor): number {
	const bpm = (editor.getDocumentSettings().meta as { bpm?: number }).bpm
	return typeof bpm === 'number' ? bpm : DEFAULT_BPM
}

export function setSongBpm(editor: Editor, bpm: number) {
	const clamped = Math.max(20, Math.min(300, Math.round(bpm) || DEFAULT_BPM))
	editor.updateDocumentSettings({ meta: { ...editor.getDocumentSettings().meta, bpm: clamped } })
	MidiEngine.get(editor).setBpm(clamped)
}

function sequenceConfig(shape: SequenceShape): SequenceConfig {
	const {
		channel,
		steps,
		stepper,
		trigMode,
		enabled,
		solo,
		notes,
		chainNext,
		chainAfter,
		clockSourceId,
		clockEvent,
	} = shape.props
	return {
		channel,
		steps,
		stepper,
		trigMode: toTrigMode(trigMode),
		enabled,
		solo,
		notes: notes.map((n) => ({
			step: n.step,
			pitch: n.pitch,
			velocity: n.velocity,
			length: n.length,
			probability: n.probability,
			ratchet: n.ratchet,
		})),
		nextAction: toNextAction(chainNext),
		nextAfterLoops: chainAfter,
		clockSourceId,
		clockEvent,
	}
}

// Rebuild the whole engine from the shapes currently on the page. Used for the
// initial sync and after loading a song (loadSnapshot replaces the store).
export function syncAllShapes(editor: Editor) {
	const engine = MidiEngine.get(editor)
	engine.clear()
	engine.setBpm(getSongBpm(editor))
	const shapes = editor.getCurrentPageShapes()
	// Sequences first, then chains so they find their members.
	for (const shape of shapes) {
		if (shape.type === SEQUENCE_TYPE) {
			engine.upsertSequence(shape.id, sequenceConfig(shape as SequenceShape))
		}
	}
	for (const shape of shapes) {
		if (shape.type === CHAIN_TYPE) {
			engine.upsertChain(shape.id, { sequenceIds: getChainMemberIds(editor, shape as ChainShape) })
		}
	}
}

/**
 * Keeps the engine in sync with the shapes on the canvas. Sequence shapes map
 * to Sequence engine objects; chain shapes map to Chain objects whose members
 * are the sequences parented to them. The Clock shape carries the tempo.
 */
export function registerEngineSync(editor: Editor): () => void {
	const engine = MidiEngine.get(editor)

	const resyncChains = () => {
		for (const shape of editor.getCurrentPageShapes()) {
			if (shape.type !== CHAIN_TYPE) continue
			const chain = shape as ChainShape
			engine.upsertChain(chain.id, { sequenceIds: getChainMemberIds(editor, chain) })
		}
	}

	const syncShape = (shape: TLShape) => {
		if (shape.type === SEQUENCE_TYPE) {
			engine.upsertSequence(shape.id, sequenceConfig(shape as SequenceShape))
			resyncChains()
		} else if (shape.type === CHAIN_TYPE) {
			const chain = shape as ChainShape
			engine.upsertChain(chain.id, { sequenceIds: getChainMemberIds(editor, chain) })
		}
	}

	syncAllShapes(editor)

	const disposers = [
		editor.sideEffects.registerAfterCreateHandler('shape', (shape) => syncShape(shape)),
		editor.sideEffects.registerAfterChangeHandler('shape', (_prev, next) => syncShape(next)),
		editor.sideEffects.registerAfterDeleteHandler('shape', (shape) => {
			if (shape.type === SEQUENCE_TYPE) {
				engine.removeSequence(shape.id)
				resyncChains()
			} else if (shape.type === CHAIN_TYPE) {
				engine.removeChain(shape.id)
			}
		}),
		// Keep tempo in sync when the document's bpm changes (e.g. undo/redo).
		editor.sideEffects.registerAfterChangeHandler('document', (_prev, next) => {
			const bpm = (next.meta as { bpm?: number }).bpm
			if (typeof bpm === 'number') engine.setBpm(bpm)
		}),
	]

	return () => disposers.forEach((d) => d())
}
