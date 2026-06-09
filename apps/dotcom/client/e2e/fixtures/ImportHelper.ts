import type { Page } from '@playwright/test'
import { step } from './tla-test'

export const IMPORT_URL = 'https://e2e-mock.tldraw.xyz/test-import.tldr'

// Sequences match the current record versions so no migrations run on import,
// which would otherwise overwrite fields (e.g. AddName sets name='').
const MINIMAL_TLDR_FILE = {
	tldrawFileFormatVersion: 1,
	schema: {
		schemaVersion: 2,
		sequences: { 'com.tldraw.document': 2, 'com.tldraw.page': 1 } as Record<string, number>,
	},
	records: [
		{
			typeName: 'document',
			id: 'document:document',
			name: 'e2e import test',
			gridSize: 10,
			meta: {},
		},
		{
			typeName: 'page',
			id: 'page:page',
			index: 'a1',
			meta: {},
			name: 'Page 1',
		},
	],
}

export class ImportHelper {
	constructor(private readonly page: Page) {}

	@step
	async mockUrl(url = IMPORT_URL) {
		await this.page.route(url, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				headers: { 'Access-Control-Allow-Origin': '*' },
				body: JSON.stringify(MINIMAL_TLDR_FILE),
			})
		)
	}

	@step
	async navigate(url = IMPORT_URL) {
		await this.page.goto(`http://localhost:3000/import?url=${encodeURIComponent(url)}`)
	}
}
