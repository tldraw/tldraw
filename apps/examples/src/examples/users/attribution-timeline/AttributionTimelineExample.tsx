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
	useValue,
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

function UserSwitcher() {
	const activeUserId = useValue(currentUserIdAtom)

	return (
		<div className="tlui-menu attribution-timeline-user-switcher">
			{Object.values(USERS).map((user) => (
				<TldrawUiButton
					key={user.id}
					type={activeUserId === user.id ? 'primary' : 'normal'}
					onClick={() => currentUserIdAtom.set(user.id)}
				>
					<span className="attribution-timeline-dot" style={{ backgroundColor: user.color }} />
					{user.name}
				</TldrawUiButton>
			))}
		</div>
	)
}

// [3]
const AttributionTimeline = track(() => {
	const editor = useEditor()
	const activeUserId = currentUserIdAtom.get()

	const [timeline, setTimeline] = useState<AttributionTimelineState>({
		entries: [],
		appliedCounts: {},
	})

	// [4]
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
		return editor.store.listen(
			({ changes }) => {
				recordChange(changes)
			},
			{ scope: 'document', source: 'user' }
		)
	}, [editor, recordChange])

	// [5]
	const userIndices = useMemo(() => {
		const map: Record<string, number[]> = {}
		timeline.entries.forEach((entry, i) => {
			if (!map[entry.userId]) map[entry.userId] = []
			map[entry.userId].push(i)
		})
		return map
	}, [timeline.entries])

	// [6]
	const totalApplied = useMemo(
		() => Object.values(timeline.appliedCounts).reduce((sum, n) => sum + n, 0),
		[timeline.appliedCounts]
	)

	// [7]
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

	// [8]
	const handleReset = useCallback(() => {
		editor.store.mergeRemoteChanges(() => {
			const shapeIds = [...editor.getCurrentPageShapeIds()]
			if (shapeIds.length > 0) editor.deleteShapes(shapeIds)
		})
		setTimeline({ entries: [], appliedCounts: {} })
	}, [editor])

	// [9]
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

const components = {
	TopPanel: UserSwitcher,
}

// [10]
export default function AttributionTimelineExample() {
	return (
		<div
			className="attribution-timeline-example"
			style={{ ['--timeline-row-count' as any]: Object.keys(USERS).length + 1 }}
		>
			<Tldraw persistenceKey="attribution-timeline-example" users={users} components={components}>
				<AttributionTimeline />
			</Tldraw>
		</div>
	)
}

/*
[1]
A fake user directory. In a real app this would be backed by your auth system. The
`TLUserStore` tells the editor who is "logged in": `currentUser` for attribution, and
`resolve` when rendering attribution labels.

[2]
Each timeline entry is a store diff plus the id, name, and color of whoever was active
when it was recorded. State also tracks, per user, how many of that user's changes are
currently applied.

[3]
The timeline component records document changes and keeps a per-user applied count.
The "All" scrubber and the per-user scrubbers are two views of the same state.

[4]
On each document change from the user (`source: 'user'` excludes our own scrubbing,
which goes through `mergeRemoteChanges`), capture the current user and append an entry.
If that user had been scrubbed back, their un-applied entries are dropped, starting a
new branch for them; other users' entries are untouched.

[5]
A per-user list of global indices into `entries`, so each user's scrubber works on its
own slice of history.

[6]
The "All" slider's value is the sum of the per-user applied counts.

[7]
Moving a user's slider applies or reverses just that user's diffs between the old and
new applied count, squashed into one diff. Other users' shapes stay put.
`mergeRemoteChanges` marks the change as remote so the listener in [4] ignores it.

[8]
Reset clears the page and the timeline state, again as a remote change so it isn't
recorded.

[9]
Moving the "All" slider rebuilds the canvas as the chronological prefix
`entries[0..N-1]`. Because per-user scrubbing can leave a non-contiguous applied set,
we diff the current set against the target prefix, queue reverses in reverse
chronological order followed by applies in forward order, and apply them as one
squashed diff.

[10]
The user store goes in via the `users` prop, the user switcher in the top panel, and the
timeline controls are rendered as a child of `Tldraw` so they can use `useEditor`.
*/
