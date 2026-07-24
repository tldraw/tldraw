import { EventBus } from './EventBus'
import { NextAction, PlayAction, Sequence } from './Sequence'
import { EventName } from './types'

interface ForwardHandles {
	noteOn: number
	noteOff: number
}

/**
 * Plays a list of sequences one at a time. Port of kaneel's Chain: it forwards
 * each member's NoteOn/NoteOff under its own identity, and watches the active
 * sequence's LoopWrap events to advance to the next sequence after a configured
 * number of iterations.
 */
export class Chain {
	private sequences: Sequence[] = []
	private forwardHandles = new Map<Sequence, ForwardHandles>()

	private activeSequence: Sequence | null = null
	private activeIndex = 0
	private playAction = PlayAction.None
	private nextAction = NextAction.None
	private targetIterations = 0
	private wrapCount = 0
	private advanceHandle = 0

	constructor(
		private eventBus: EventBus,
		public readonly id: number
	) {
		this.eventBus.register(this)
	}

	get activeSequenceIndex() {
		return this.activeSequence ? this.activeIndex : -1
	}

	get size() {
		return this.sequences.length
	}

	addSequence(seq: Sequence) {
		if (this.forwardHandles.has(seq)) return
		this.sequences.push(seq)
		this.subscribe(seq)
	}

	private subscribe(seq: Sequence) {
		const noteOn = seq.addListener(EventName.NoteOn, (data) => {
			this.eventBus.dispatchEvent(this, { name: EventName.NoteOn, data })
		})
		const noteOff = seq.addListener(EventName.NoteOff, (data) => {
			this.eventBus.dispatchEvent(this, { name: EventName.NoteOff, data })
		})
		this.forwardHandles.set(seq, { noteOn, noteOff })
	}

	// Reconcile the chain's membership to `next` in order, keeping the chain's
	// identity stable so anything listening to the chain's events stays bound,
	// and without interrupting the active sequence when unrelated members change.
	setMembers(next: Sequence[]) {
		const nextSet = new Set(next)
		for (const seq of [...this.sequences]) {
			if (!nextSet.has(seq)) this.removeSequence(seq)
		}
		for (const seq of next) {
			if (!this.forwardHandles.has(seq)) this.subscribe(seq)
		}
		this.sequences = [...next]
		if (this.activeSequence) {
			const idx = this.sequences.indexOf(this.activeSequence)
			if (idx === -1) {
				this.clearAdvanceSubscription()
				this.activeSequence = null
			} else {
				this.activeIndex = idx
			}
		}
	}

	removeSequence(seq: Sequence) {
		const handles = this.forwardHandles.get(seq)
		if (handles) {
			seq.removeListener(EventName.NoteOn, handles.noteOn)
			seq.removeListener(EventName.NoteOff, handles.noteOff)
			this.forwardHandles.delete(seq)
		}

		if (this.activeSequence === seq) {
			this.clearAdvanceSubscription()
			this.activeSequence = null
		}

		this.sequences = this.sequences.filter((s) => s !== seq)
	}

	private clearAdvanceSubscription() {
		if (this.activeSequence && this.advanceHandle) {
			this.activeSequence.removeListener(EventName.LoopWrap, this.advanceHandle)
		}
		this.advanceHandle = 0
	}

	setActiveSequence(index: number) {
		if (index < 0 || index >= this.sequences.length) return
		const seq = this.sequences[index]
		if (!seq) return

		this.clearAdvanceSubscription()

		this.activeIndex = index
		this.activeSequence = seq
		this.activeSequence.restart()

		this.playAction = seq.playActionValue
		this.nextAction = seq.nextActionValue
		this.targetIterations = seq.nextTimingValue
		this.wrapCount = 0

		if (this.playAction === PlayAction.LoopIteration && this.targetIterations > 0) {
			this.advanceHandle = this.activeSequence.addListener(EventName.LoopWrap, () => {
				if (++this.wrapCount >= this.targetIterations) {
					this.setNextSequence()
				}
			})
		}
	}

	setNextSequence() {
		if (!this.activeSequence) return
		this.activeSequence.stop()

		let target = this.activeIndex
		switch (this.nextAction) {
			case NextAction.Next:
				target = this.activeIndex + 1
				break
			case NextAction.Previous:
				target = this.activeIndex - 1
				break
			case NextAction.First:
				target = 0
				break
			case NextAction.Last:
				target = this.sequences.length - 1
				break
			case NextAction.None:
				target = this.activeIndex + 1
				break
		}

		if (target < 0) target = this.sequences.length - 1
		if (target >= this.sequences.length) target = 0

		this.setActiveSequence(target)
	}

	stop() {
		this.clearAdvanceSubscription()
		this.activeSequence?.stop()
		this.activeSequence = null
	}

	dispose() {
		this.clearAdvanceSubscription()
		for (const [seq, handles] of this.forwardHandles) {
			seq.removeListener(EventName.NoteOn, handles.noteOn)
			seq.removeListener(EventName.NoteOff, handles.noteOff)
		}
		this.forwardHandles.clear()
		this.eventBus.unregister(this)
	}
}
