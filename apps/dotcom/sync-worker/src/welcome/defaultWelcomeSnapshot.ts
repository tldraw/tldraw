// The committed *default* welcome document — the fallback content a new workspace's first
// file is seeded with when no file is marked as the welcome template (fresh dev/preview/prod,
// before an admin has set one). Once a welcome template file is marked, its published
// snapshot is used instead and this default is no longer consulted. Its canvas is a
// workspace onboarding walkthrough in the brand's illustration style (the Cloudy/Penta
// characters) covering creating a workspace, what a workspace is, inviting your team with an
// invite link, moving files in, pinning files, and managing members.
//
// The snapshot itself lives beside the worker as a Workers Static Asset —
// `assets/welcome-snapshot.json`, the JSON of a RoomSnapshot — rather than bundled into the
// worker script, so the ~180KB of pre-serialized records (mostly base64 illustration SVGs)
// does not count against the Worker bundle size. It is read at seed time through the ASSETS
// binding (worker-internal; `run_worker_first` keeps it from ever being served publicly),
// cached as text per isolate, and JSON.parsed fresh per seed so no mutable snapshot object is
// shared between rooms.
//
// Schema migrations are handled for you: welcome.test.ts keeps the JSON baked at the current
// schema, so when a migration touches these records the test fails and `yarn test -u` re-bakes
// `assets/welcome-snapshot.json`. Only redesigning the default canvas needs a manual
// re-export: open a file in the app, build the content, and rebuild the RoomSnapshot JSON
// ({ documentClock: 0, tombstoneHistoryStartsAtClock: 0, schema, documents: records.map(
// (state) => ({ state, lastChangedClock: 0 })) }):
//
//   JSON.stringify({
//     schema: editor.store.schema.serialize(),
//     records: Object.values(editor.store.serialize('document')),
//   })
//
// Keep only document/page/shape (and asset/binding) records: drop any `user` records and
// reset any `textLastEditedBy` props to null, since those carry the authoring user's identity.
//
// Keep the content near the origin and inside roughly 1200x800 page units: new files open at
// the default camera (no zoom-to-fit on first visit), so the canvas must fit a typical editor
// viewport. welcome.test.ts asserts a coarse bounds envelope for this.
import { RoomSnapshot } from '@tldraw/sync-core'
import { Environment } from '../types'

// The path the default welcome snapshot is served from by the ASSETS binding. Kept in sync with
// the file in `assets/` and the `[assets]` directory in wrangler.toml.
export const DEFAULT_WELCOME_SNAPSHOT_ASSET_PATH = '/welcome-snapshot.json'

// The asset is immutable for the life of a deploy, so cache the fetched JSON text per isolate.
// Callers JSON.parse a fresh object per seed, so no mutable snapshot is shared between rooms.
let cachedWelcomeSnapshotJson: string | undefined

/**
 * Load the committed default welcome `RoomSnapshot` from the ASSETS binding. The JSON text is
 * fetched once per isolate and cached; each call JSON.parses it afresh so every seeded room
 * gets its own mutable copy.
 */
export async function loadDefaultWelcomeSnapshot(env: Environment): Promise<RoomSnapshot> {
	if (cachedWelcomeSnapshotJson === undefined) {
		// The host is ignored by the ASSETS binding, which matches on path only.
		const response = await env.ASSETS.fetch(
			new URL(DEFAULT_WELCOME_SNAPSHOT_ASSET_PATH, 'https://assets.invalid')
		)
		if (!response.ok) {
			throw new Error(`failed to load default welcome snapshot: ${response.status}`)
		}
		cachedWelcomeSnapshotJson = await response.text()
	}
	return JSON.parse(cachedWelcomeSnapshotJson) as RoomSnapshot
}
