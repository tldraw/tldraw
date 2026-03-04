import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	RecordsDiff,
	reverseRecordsDiff,
	squashRecordDiffs,
	Tldraw,
	TldrawUiButton,
	TldrawUiSlider,
	track,
	useEditor,
	type TLIdentityProvider,
	type TLIdentityUser,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './attribution-timeline.css'

// There's a guide at the bottom of this file!

// [1]
const USERS: Record<string, TLIdentityUser> = {
	'user-alice': { id: 'user-alice', name: 'Alice', color: '#e03131' },
	'user-bob': { id: 'user-bob', name: 'Bob', color: '#1971c2' },
	'user-carol': { id: 'user-carol', name: 'Carol', color: '#2f9e44' },
}

let currentUserId = 'user-alice'

const identity: TLIdentityProvider = {
	getCurrentUser() {
		return USERS[currentUserId] ?? null
	},
	resolveUser(userId: string) {
		return USERS[userId] ?? null
	},
}

// [2]
interface AttributionTimelineEntry {
	timestamp: number
	diff: RecordsDiff<any>
	userId: string | null
	userName: string | null
	userColor: string | undefined
}

interface AttributionTimelineState {
	entries: AttributionTimelineEntry[]
	currentIndex: number
	filterUserId: string | null
}

// [3]
export default function AttributionTimelineExample() {
	return (
		<div className="attribution-timeline-example">
			<Tldraw
				persistenceKey="attribution-timeline-example"
				components={{
					TopPanel: UserSwitcher,
				}}
				onMount={(editor) => {
					;(editor as any)._identity = identity
				}}
			>
				<AttributionTimeline />
			</Tldraw>
		</div>
	)
}

function UserSwitcher() {
	const [activeUserId, setActiveUserId] = useState(currentUserId)

	return (
		<div className="tlui-menu attribution-timeline-user-switcher">
			{Object.values(USERS).map((user) => (
				<TldrawUiButton
					key={user.id}
					type={activeUserId === user.id ? 'primary' : 'normal'}
					onClick={() => {
						currentUserId = user.id
						setActiveUserId(user.id)
					}}
				>
					<span className="attribution-timeline-dot" style={{ backgroundColor: user.color }} />
					{user.name}
				</TldrawUiButton>
			))}
		</div>
	)
}

// [4]
const AttributionTimeline = track(() => {
	const editor = useEditor()

	const [timeline, setTimeline] = useState<AttributionTimelineState>({
		entries: [],
		currentIndex: 0,
		filterUserId: null,
	})

	// [5]
	const recordChange = useCallback(
		(diff: RecordsDiff<any>) => {
			const user = editor.getIdentity().getCurrentUser()
			const newEntry: AttributionTimelineEntry = {
				timestamp: Date.now(),
				diff,
				userId: user?.id ?? null,
				userName: user?.name ?? null,
				userColor: user?.color,
			}

			setTimeline((prev) => {
				if (prev.currentIndex < prev.entries.length) {
					const newEntries = prev.entries.slice(0, prev.currentIndex)
					newEntries.push(newEntry)
					return {
						...prev,
						entries: newEntries,
						currentIndex: newEntries.length,
					}
				} else {
					return {
						...prev,
						entries: [...prev.entries, newEntry],
						currentIndex: prev.entries.length + 1,
					}
				}
			})
		},
		[editor]
	)

	useEffect(() => {
		if (!editor) return

		return editor.store.listen(
			({ changes }) => {
				recordChange(changes)
			},
			{ scope: 'document', source: 'user' }
		)
	}, [editor, recordChange])

	// [6]
	const filteredGlobalIndices = useMemo(() => {
		if (!timeline.filterUserId) return null
		const indices: number[] = []
		for (let i = 0; i < timeline.entries.length; i++) {
			if (timeline.entries[i].userId === timeline.filterUserId) {
				indices.push(i + 1)
			}
		}
		return indices
	}, [timeline.entries, timeline.filterUserId])

	const filteredSteps = filteredGlobalIndices?.length ?? timeline.entries.length
	const filteredValue = filteredGlobalIndices
		? filteredGlobalIndices.filter((gi) => gi <= timeline.currentIndex).length
		: timeline.currentIndex

	// [7]
	const navigateToIndex = useCallback(
		(targetIndex: number) => {
			if (!editor || targetIndex === timeline.currentIndex) return

			const { entries, currentIndex } = timeline

			const isForward = targetIndex > currentIndex
			const diffsToApply = entries
				.slice(Math.min(currentIndex, targetIndex), Math.max(currentIndex, targetIndex))
				.map((entry) => entry.diff)

			if (diffsToApply.length > 0) {
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

	// [8]
	const handleSliderChange = useCallback(
		(sliderValue: number) => {
			if (filteredGlobalIndices) {
				const globalIndex = sliderValue === 0 ? 0 : filteredGlobalIndices[sliderValue - 1]
				navigateToIndex(globalIndex)
			} else {
				navigateToIndex(sliderValue)
			}
		},
		[navigateToIndex, filteredGlobalIndices]
	)

	const setFilter = useCallback((userId: string | null) => {
		setTimeline((prev) => ({ ...prev, filterUserId: userId }))
	}, [])

	const activeUsers = useMemo(() => {
		const seen = new Set<string>()
		for (const entry of timeline.entries) {
			if (entry.userId) seen.add(entry.userId)
		}
		return Object.values(USERS).filter((u) => seen.has(u.id))
	}, [timeline.entries])

	const isEmpty = filteredSteps === 0
	const length = Math.max(3, String(filteredSteps).length)

	const sliderTitle = (() => {
		if (timeline.currentIndex === 0) return 'Empty canvas'
		const entry = timeline.entries[timeline.currentIndex - 1]
		if (!entry) return ''
		const time = new Date(entry.timestamp).toLocaleTimeString()
		const who = entry.userName ?? 'Unknown'
		return `${who} — ${time}`
	})()

	return (
		<div className="attribution-timeline-controls">
			<div className="attribution-timeline-filters">
				<TldrawUiButton
					type={timeline.filterUserId === null ? 'primary' : 'normal'}
					onClick={() => setFilter(null)}
				>
					All
				</TldrawUiButton>
				{activeUsers.map((user) => (
					<TldrawUiButton
						key={user.id}
						type={timeline.filterUserId === user.id ? 'primary' : 'normal'}
						onClick={() => setFilter(user.id)}
					>
						<span className="attribution-timeline-dot" style={{ backgroundColor: user.color }} />
						{user.name}
					</TldrawUiButton>
				))}
			</div>
			<div className="attribution-timeline-info">
				{isEmpty
					? '000 / 000'
					: `${filteredValue.toString().padStart(length, '0')} / ${filteredSteps.toString().padStart(length, '0')}`}
			</div>
			<TldrawUiSlider
				steps={filteredSteps}
				value={isEmpty ? 1 : filteredValue}
				label="History"
				title={sliderTitle}
				onValueChange={handleSliderChange}
			/>
		</div>
	)
})

/*
[1]
A fake user directory. In a real app this would be backed by your auth system.
The TLIdentityProvider tells the editor who is "logged in" — the editor calls
getCurrentUser when stamping tlmeta on shape create/update, and resolveUser
when rendering attribution labels.

[2]
Each timeline entry extends the basic diff with the userId, name, and color
of whoever was active when the change was recorded.

[3]
The main component wires everything together: the TopPanel shows the user
switcher, the identity provider is injected in onMount, and the
AttributionTimeline child renders the bottom controls bar.

[4]
The timeline component tracks all document changes, the current playback
position, and the active user filter.

[5]
When the store fires a document change (source: 'user'), we capture the
current user from the identity provider and push a new entry. If we're
scrubbed back in time, future entries are truncated to create a new branch.

[6]
When a user filter is active, we build an array of 1-based global indices
where that user made changes. The slider steps and value are derived from
this filtered view. Scrubbing to "Alice's change #2" means navigating to the
global index of her second entry — all intervening changes by other users
are included, so the canvas always shows a consistent state.

[7]
Navigation collects the diffs between the current position and target,
squashes them, and applies (reversing if going backward). Uses
mergeRemoteChanges so the scrub doesn't trigger our own listener.

[8]
When a filter is active, slider positions map through filteredGlobalIndices
to reach the correct global index. Position 0 always means empty canvas.
*/
