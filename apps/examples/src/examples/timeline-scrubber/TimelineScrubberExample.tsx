import { useCallback, useEffect, useState } from 'react'
import {
	RecordsDiff,
	reverseRecordsDiff,
	squashRecordDiffs,
	Tldraw,
	TldrawUiSlider,
	track,
	useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './timeline-scrubber.css'

interface TimelineEntry {
	timestamp: number
	diff: RecordsDiff<any>
}

interface TimelineState {
	entries: TimelineEntry[]
	currentIndex: number
}

export default function TimelineScrubberExample() {
	return (
		<div className="timeline-scrubber-example">
			<Tldraw>
				<TimelineScrubber />
			</Tldraw>
		</div>
	)
}

const TimelineScrubber = track(() => {
	const editor = useEditor()

	const [timeline, setTimeline] = useState<TimelineState>({
		entries: [],
		currentIndex: 0,
	})

	// [1]
	const recordChange = useCallback((diff: RecordsDiff<any>) => {
		const newEntry: TimelineEntry = {
			timestamp: Date.now(),
			diff,
		}

		setTimeline((prev) => {
			// [2]
			if (prev.currentIndex < prev.entries.length) {
				// We're scrubbed back in time, create new timeline branch
				const newEntries = prev.entries.slice(0, prev.currentIndex)
				newEntries.push(newEntry)
				return {
					entries: newEntries,
					currentIndex: newEntries.length,
				}
			} else {
				// Normal forward progression
				const newEntries = [...prev.entries, newEntry]
				return {
					entries: newEntries,
					currentIndex: newEntries.length,
				}
			}
		})
	}, [])

	// [3]
	useEffect(() => {
		if (!editor) return

		const cleanupFn = editor.store.listen(
			({ changes }) => {
				recordChange(changes)
			},
			{ scope: 'document', source: 'user' }
		)

		return cleanupFn
	}, [editor, recordChange])

	// [4]
	const navigateToIndex = useCallback(
		(targetIndex: number) => {
			if (!editor || targetIndex === timeline.currentIndex) return

			const { entries, currentIndex } = timeline

			const isForward = targetIndex > currentIndex
			const diffsToApply = entries
				.slice(Math.min(currentIndex, targetIndex), Math.max(currentIndex, targetIndex))
				.map((entry) => entry.diff)

			if (diffsToApply.length > 0) {
				if (!isForward) diffsToApply.reverse()

				let diffToApply =
					diffsToApply.length === 1 ? diffsToApply[0] : squashRecordDiffs(diffsToApply)

				if (!isForward) {
					diffToApply = reverseRecordsDiff(diffToApply)
				}

				editor.store.mergeRemoteChanges(() => {
					editor.store.applyDiff(diffToApply)
				})
			}

			setTimeline((prev) => ({ ...prev, currentIndex: targetIndex }))
		},
		[timeline, editor]
	)

	const handleSliderChange = useCallback(
		(newIndex: number) => {
			navigateToIndex(newIndex)
		},
		[navigateToIndex]
	)

	const isEmpty = timeline.entries.length === 0

	const length = Math.max(3, String(timeline.entries.length).length)

	return (
		<div className="timeline-scrubber-controls">
			<div className="timeline-scrubber-info">
				{isEmpty
					? '000 / 000'
					: `${timeline.currentIndex.toString().padStart(length, '0')} / ${timeline.entries.length.toString().padStart(length, '0')}`}
			</div>
			<TldrawUiSlider
				steps={timeline.entries.length}
				value={isEmpty ? 1 : timeline.currentIndex}
				label="History"
				title={
					timeline.currentIndex === 0
						? 'Empty canvas'
						: new Date(
								timeline.entries[timeline.currentIndex - 1]?.timestamp ?? Date.now()
							).toLocaleString()
				}
				onValueChange={handleSliderChange}
			/>
		</div>
	)
})

/*
[1]
The recordChange function handles new changes from the store. It creates a new timeline entry
and manages timeline branching logic.

[2]
If we're not at the latest point in time (currentIndex < entries.length), it means the user
made a change while scrubbed back. We truncate the future timeline and create a new branch.
Timeline indexing: 0 = empty canvas, 1 = first change applied, 2 = second change, etc.

[3] 
We listen to document changes from user actions only, filtering out changes we make during
navigation to avoid recording our own time travel operations.

[4]
Navigation collects the required diffs, squashes them into a single optimized diff, then
applies it (reversing first if going backward). Uses mergeRemoteChanges to ensure changes
are treated as remote and don't trigger our listener.
*/
