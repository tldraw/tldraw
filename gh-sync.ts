/* eslint-disable no-console */
// gh-sync: tldraw canvas ↔ external systems (GitHub, soon Notion + HubSpot).
//
// Each external system has its own ProviderAdapter under gh-sync/adapters/.
// At boot we register the adapters we want, hydrate them, register tldraw
// webhooks, and start the HTTP server.
//
// Run:
//   GITHUB_TOKEN=ghp_...               \
//   GITHUB_REPO=tldraw/tldraw-internal \
//   GITHUB_WEBHOOK_SECRET=...          \
//   TLDR_API_TOKEN=...                 \
//   TLDR_FILE_SLUG=...                 \
//   TLDR_PUBLIC_URL=https://...        \
//     npx tsx gh-sync.ts
import { registerAdapter, listAdapters } from './gh-sync/arrows'
import { GithubAdapter } from './gh-sync/adapters/github'
import { HubspotAdapter } from './gh-sync/adapters/hubspot'
import { NotionAdapter } from './gh-sync/adapters/notion'
import { startServer } from './gh-sync/server'
import { syncTldrawWebhooks } from './gh-sync/tldraw'

// Layout: each provider gets its own canvas region (originX, originY). GitHub
// occupies x≈0..1300; Notion sits to its right; HubSpot to the right of Notion.
// Tweak as the canvas fills out.
const GITHUB_ORIGIN = { x: 0, y: 0 }
const NOTION_ORIGIN = { x: 1400, y: 0 }
const HUBSPOT_ORIGIN = { x: 3100, y: 0 }

async function main() {
	registerAdapter(new GithubAdapter({ originX: GITHUB_ORIGIN.x, originY: GITHUB_ORIGIN.y }))

	if (process.env.NOTION_TOKEN && process.env.NOTION_DATABASE_ID) {
		registerAdapter(new NotionAdapter({ originX: NOTION_ORIGIN.x, originY: NOTION_ORIGIN.y }))
	} else {
		console.log('Skipping Notion adapter (set NOTION_TOKEN + NOTION_DATABASE_ID to enable).')
	}

	if (process.env.HUBSPOT_TOKEN) {
		registerAdapter(new HubspotAdapter({ originX: HUBSPOT_ORIGIN.x, originY: HUBSPOT_ORIGIN.y }))
	} else {
		console.log('Skipping HubSpot adapter (set HUBSPOT_TOKEN to enable).')
	}

	for (const adapter of listAdapters()) {
		await adapter.hydrate()
	}
	await syncTldrawWebhooks()

	startServer()
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
