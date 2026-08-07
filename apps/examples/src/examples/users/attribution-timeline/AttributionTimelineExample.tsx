import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	atom,
	computed,
	createCachedUserResolve,
	createUserId,
	RecordsDiff,
	reverseRecordsDiff,
	squashRecordDiffs,
	Tldraw,
	TldrawUiButton,
	TldrawUiSlider,
	TLUser,
	TLUserStore,
	track,
	useEditor,
	UserRecordType,
} from 'tldraw'
import 'tldraw/tldraw.css'
import './attribution-timeline.css'

// There's a guide at the bottom of this file!

// [1]
const USERS: Record<string, TLUser> = {
	[createUserId('alice')]: UserRecordType.create({
		id: createUserId('alice'),
		name: 'Alice',
		color: '#e03131',
	}),
	[createUserId('bob')]: UserRecordType.create({
		id: createUserId('bob'),
		name: 'Bob',
		color: '#1971c2',
	}),
	[createUserId('carol')]: UserRecordType.create({
		id: createUserId('carol'),
		name: 'Carol',
		color: '#2f9e44',
	}),
}

const currentUserIdAtom = atom('currentUserId', createUserId('alice'))

const currentUserSignal = computed('currentUser', () => {
	return USERS[currentUserIdAtom.get()] ?? null
})

const users: TLUserStore = {
	currentUser: currentUserSignal,
	resolve: createCachedUserResolve((userId) => USERS[createUserId(userId)] ?? null),
}

// [2]
interface AttributionTimelineEntry {
	timestamp: number
	diff: RecordsDiff<any>
	userId: string
	userName: string
	userColor: string | undefined
}

interface AttributionTimelineState {
	entries: AttributionTimelineEntry[]
	appliedCounts: Record<string, number>
}

// [3]
export default function AttributionTimelineExample() {
	return (
		<div
			className="attribution-timeline-example"
			style={{ ['--timeline-row-count' as any]: Object.keys(USERS).length + 1 }}
		>
			<Tldraw
				persistenceKey="attribution-timeline-example"
				users={users}
				components={{
					TopPanel: UserSwitcher,
				}}
			>
				<AttributionTimeline />
			</Tldraw>
		</div>
	)
}

function UserSwitcher() {
	const [activeUserId, setActiveUserId] = useState(currentUserIdAtom.get())

	return (
		<div className="tlui-menu attribution-timeline-user-switcher">
			{Object.values(USERS).map((user) => (
				<TldrawUiButton
					key={user.id}
					type={activeUserId === user.id ? 'primary' : 'normal'}
					onClick={() => {
						currentUserIdAtom.set(user.id)
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
	const activeUserId = currentUserIdAtom.get()

	const [timeline, setTimeline] = useState<AttributionTimelineState>({
		entries: [],
		appliedCounts: {},
	})

	// [5]
	const recordChange = useCallback(
		(diff: RecordsDiff<any>) => {
			const user = editor.store.props.users.currentUser.get()
			if (!user) return

			const newEntry: AttributionTimelineEntry = {
				timestamp: Date.now(),
				diff,
				userId: user.id,
				userName: user.name,
				userColor: user.color,
			}

			setTimeline((prev) => {
				const userId = user.id
				const applied = prev.appliedCounts[userId] ?? 0
				let userSeen = 0
				let truncated = false
				const newEntries: AttributionTimelineEntry[] = []
				for (const entry of prev.entries) {
					if (entry.userId === userId) {
						if (userSeen < applied) {
							newEntries.push(entry)
							userSeen++
						} else {
							truncated = true
						}
					} else {
						newEntries.push(entry)
					}
				}
				newEntries.push(newEntry)

				return {
					entries: truncated ? newEntries : [...prev.entries, newEntry],
					appliedCounts: { ...prev.appliedCounts, [userId]: applied + 1 },
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
	const userIndices = useMemo(() => {
		const map: Record<string, number[]> = {}
		timeline.entries.forEach((entry, i) => {
			if (!map[entry.userId]) map[entry.userId] = []
			map[entry.userId].push(i)
		})
		return map
	}, [timeline.entries])

	// [7]
	const totalApplied = useMemo(
		() => Object.values(timeline.appliedCounts).reduce((sum, n) => sum + n, 0),
		[timeline.appliedCounts]
	)

	// [8]
	const handleUserSliderChange = useCallback(
		(userId: string, nextApplied: number) => {
			const prevApplied = timeline.appliedCounts[userId] ?? 0
			if (nextApplied === prevApplied) return

			const indices = userIndices[userId]
			if (!indices) return

			const isForward = nextApplied > prevApplied
			const lo = Math.min(prevApplied, nextApplied)
			const hi = Math.max(prevApplied, nextApplied)

			const userDiffs: RecordsDiff<any>[] = []
			for (let i = lo; i < hi; i++) {
				userDiffs.push(timeline.entries[indices[i]].diff)
			}

			if (userDiffs.length > 0) {
				let diff = userDiffs.length === 1 ? userDiffs[0] : squashRecordDiffs(userDiffs)
				if (!isForward) {
					diff = reverseRecordsDiff(diff)
				}
				editor.store.mergeRemoteChanges(() => {
					editor.store.applyDiff(diff)
				})
			}

			setTimeline((prev) => ({
				...prev,
				appliedCounts: { ...prev.appliedCounts, [userId]: nextApplied },
			}))
		},
		[editor, timeline, userIndices]
	)

	// [9]
	const handleReset = useCallback(() => {
		editor.store.mergeRemoteChanges(() => {
			const shapeIds = [...editor.getCurrentPageShapeIds()]
			if (shapeIds.length > 0) editor.deleteShapes(shapeIds)
		})
		setTimeline({ entries: [], appliedCounts: {} })
	}, [editor])

	// [10]
	const handleAllSliderChange = useCallback(
		(nextValue: number) => {
			const { entries, appliedCounts } = timeline

			const newAppliedCounts: Record<string, number> = {}
			for (let i = 0; i < nextValue; i++) {
				const id = entries[i].userId
				newAppliedCounts[id] = (newAppliedCounts[id] ?? 0) + 1
			}

			const currentlyApplied = new Array(entries.length).fill(false)
			const seen: Record<string, number> = {}
			entries.forEach((entry, i) => {
				const n = (seen[entry.userId] = (seen[entry.userId] ?? 0) + 1)
				if (n <= (appliedCounts[entry.userId] ?? 0)) currentlyApplied[i] = true
			})

			const ordered: RecordsDiff<any>[] = []
			for (let i = entries.length - 1; i >= 0; i--) {
				const targetApplied = i < nextValue
				if (currentlyApplied[i] && !targetApplied) {
					ordered.push(reverseRecordsDiff(entries[i].diff))
				}
			}
			for (let i = 0; i < entries.length; i++) {
				const targetApplied = i < nextValue
				if (!currentlyApplied[i] && targetApplied) {
					ordered.push(entries[i].diff)
				}
			}

			if (ordered.length > 0) {
				const diff = ordered.length === 1 ? ordered[0] : squashRecordDiffs(ordered)
				editor.store.mergeRemoteChanges(() => {
					editor.store.applyDiff(diff)
				})
			}

			setTimeline((prev) => ({ ...prev, appliedCounts: newAppliedCounts }))
		},
		[editor, timeline]
	)

	const totalEntries = timeline.entries.length
	const totalLength = Math.max(2, String(totalEntries).length)
	const allTitle = (() => {
		if (totalEntries === 0) return 'No changes yet'
		if (totalApplied === 0) return 'Empty canvas'
		const recent = timeline.entries[totalApplied - 1]
		if (!recent) return ''
		const time = new Date(recent.timestamp).toLocaleTimeString()
		return `${recent.userName} — ${time}`
	})()

	return (
		<div className="attribution-timeline-controls">
			<div className="attribution-timeline-row attribution-timeline-row--all">
				<div className="attribution-timeline-user">
					<span className="attribution-timeline-name">All</span>
				</div>
				<TldrawUiSlider
					steps={Math.max(totalEntries, 1)}
					value={totalEntries === 0 ? null : totalApplied}
					label="History"
					title={allTitle}
					onValueChange={handleAllSliderChange}
				/>
				<div className="attribution-timeline-info">
					{`${totalApplied.toString().padStart(totalLength, '0')} / ${totalEntries.toString().padStart(totalLength, '0')}`}
				</div>
				<TldrawUiButton
					type="normal"
					disabled={totalEntries === 0}
					onClick={handleReset}
					tooltip="Clear the canvas and timeline history"
					className="attribution-timeline-reset"
				>
					Reset
				</TldrawUiButton>
			</div>
			{Object.values(USERS).map((user) => {
				const indices = userIndices[user.id] ?? []
				const total = indices.length
				const applied = timeline.appliedCounts[user.id] ?? 0
				const length = Math.max(2, String(total).length)
				const isEmpty = total === 0

				const sliderTitle = (() => {
					if (isEmpty) return `${user.name} hasn't made any changes yet`
					if (applied === 0) return `None of ${user.name}'s changes applied`
					const entry = timeline.entries[indices[applied - 1]]
					if (!entry) return ''
					const time = new Date(entry.timestamp).toLocaleTimeString()
					return `${user.name} — ${time}`
				})()

				return (
					<div
						key={user.id}
						className={`attribution-timeline-row${user.id === activeUserId ? ' attribution-timeline-row--active' : ''}`}
					>
						<div className="attribution-timeline-user">
							<span className="attribution-timeline-dot" style={{ backgroundColor: user.color }} />
							<span className="attribution-timeline-name">{user.name}</span>
						</div>
						<TldrawUiSlider
							steps={Math.max(total, 1)}
							value={isEmpty ? null : applied}
							label="History"
							title={sliderTitle}
							onValueChange={(value) => handleUserSliderChange(user.id, value)}
						/>
						<div className="attribution-timeline-info">
							{`${applied.toString().padStart(length, '0')} / ${total.toString().padStart(length, '0')}`}
						</div>
					</div>
				)
			})}
		</div>
	)
})

/*
[1]
A fake user directory. In a real app this would be backed by your auth system.
The TLUserStore tells the editor who is "logged in" — the editor reads
currentUser for attribution purposes, and resolve when rendering
attribution labels.

[2]
Each timeline entry extends the basic diff with the userId, name, and color
of whoever was active when the change was recorded. State tracks all entries
plus a per-user count of how many of that user's changes are currently applied.

[3]
The main component wires everything together: the TopPanel shows the user
switcher, the user store is passed as the `users` prop, and the
AttributionTimeline child renders the bottom controls bar with an "All"
scrubber and a separate scrubber per user.

[4]
The timeline component tracks all document changes and a per-user applied
count. The "All" scrubber and the per-user scrubbers operate on the same
underlying state from different angles.

[5]
When the store fires a document change (source: 'user'), we capture the
current user from the identity provider and append a new entry. If the
acting user was scrubbed back (some of their previous changes reverted),
those un-applied entries are dropped to create a new branch for that user.
Other users' entries are untouched.

[6]
We derive a per-user list of global indices into `entries`. Each user's
scrubber operates on its own slice of history.

[7]
The "All" slider's displayed value is just the sum of every per-user
applied count — a snapshot of how much of the combined history is on
canvas right now.

[8]
Moving a user's slider applies or reverses just that user's diffs between
the previous and next applied count. Other users' shapes stay on canvas.
We use mergeRemoteChanges so the scrub doesn't trigger our own listener.

[9]
Reset clears every shape on the current page and resets the timeline
state. We use mergeRemoteChanges so the deletion isn't recorded back into
the timeline by our own listener.

[10]
Moving the "All" slider rebuilds the canvas as the chronological prefix
entries[0..N-1]. We compute the current applied set (which may not be a
contiguous prefix if per-user sliders have been moved), diff it against
the target prefix, then queue reverses (in reverse chronological order)
followed by applies (in forward chronological order) into a single
squashed diff.
*/
