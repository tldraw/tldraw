import {
	CanvasComments,
	commentToolOverrides,
	commentTools,
	filterMentionMembers,
	MentionMember,
} from '@tldraw/commenting'
import { getLicenseKey } from '@tldraw/dotcom-shared'
import { useMemo } from 'react'
import { commentSchemaRecords, createTLSchema, createTLStore, TLComponents, Tldraw } from 'tldraw'
import '@tldraw/commenting/commenting.css'
import 'tldraw/tldraw.css'

// The people who can be @-mentioned. A real app would pull this from its own roster; the composer
// filters this list as you type after `@`. Ids match the author directory below.
const MEMBERS: MentionMember[] = [
	{ id: 'me', name: 'You', you: true },
	{ id: 'ada', name: 'Ada Lovelace' },
	{ id: 'grace', name: 'Grace Hopper' },
	{ id: 'alan', name: 'Alan Turing' },
]

// A tiny local user directory so the flow shows names instead of ids. A real app would resolve
// these from its own identity system.
const NAMES: Record<string, string> = Object.fromEntries(MEMBERS.map((m) => [m.id, m.name]))
const resolveName = (id: string): string => NAMES[id] ?? id

// Region comments are off by default (click-only). Enable dragging out a rectangle to comment on an
// area. A module-level constant keeps the object identity stable across renders.
const REGION_OPTIONS = { enabled: true }

export default function CommentingExample() {
	// Comments are stored as `comment-thread` and `comment` records in the editor's own store.
	// Registering `commentSchemaRecords` on the schema is all it takes to persist and sync them
	// alongside shapes — no separate backend, so the whole flow runs in-memory here.
	const store = useMemo(
		() => createTLStore({ schema: createTLSchema({ records: commentSchemaRecords }) }),
		[]
	)

	// `CanvasComments` reads those records reactively and draws the pins, threads, and composer.
	// Mounting it in front of the canvas is the entire UI layer.
	const components = useMemo<TLComponents>(
		() => ({
			InFrontOfTheCanvas: () => (
				<CanvasComments
					currentUserId="me"
					resolveName={resolveName}
					regionOptions={REGION_OPTIONS}
					getMentionSuggestions={(query) => filterMentionMembers(MEMBERS, query)}
				/>
			),
		}),
		[]
	)

	return (
		<div className="tldraw__editor">
			<Tldraw
				// Commenting is a licensed feature. Every feature is enabled in local development, but a
				// deployed app needs a license key that includes commenting — swap in your own key here.
				licenseKey={getLicenseKey()}
				store={store}
				tools={commentTools}
				overrides={[commentToolOverrides]}
				components={components}
			/>
		</div>
	)
}
