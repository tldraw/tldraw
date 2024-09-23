import { Browser, chromium } from 'playwright'
import { Database, open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { TLStoreSnapshot } from 'tldraw'

export class TldrawScreenshotManager {
	db: Database
	browser: Browser
	queue: { id: string; hash: string; cb(screenshot: string): void }[] = []
	reactAppHost = 'localhost:5001'
	debug = true

	constructor(browser: Browser, db: Database) {
		this.browser = browser
		this.db = db
	}

	async setup() {
		const { db } = this
		// Create a table of snapshots, with snapshots being JSON blobs
		await db.run('DROP TABLE IF EXISTS snapshots')
		await db.run('CREATE TABLE snapshots (id TEXT PRIMARY KEY, snapshot TEXT, hash TEXT)')

		// Create a table of base64 screenshots with screenshots being base64 strings
		await db.run('DROP TABLE IF EXISTS screenshots')
		await db.run('CREATE TABLE screenshots (id TEXT PRIMARY KEY, screenshot TEXT, hash TEXT)')
	}

	async processNextInQueue() {
		const { db, browser, queue } = this
		// only start if only one item is in the queue
		if (queue.length > 1) return

		// eslint-disable-next-line
		if (this.debug) console.log('processing queue')

		// now process the whole queue
		while (queue.length) {
			const item = queue.shift()
			if (!item) continue
			const { id, hash, cb } = item
			// open the page, wait for the content, and take a screenshot
			const page = await browser.newPage()
			await page.goto(`${this.reactAppHost}/file/${id}`)
			await page.waitForSelector('.tl-container')
			const screenshotBuffer = await page.screenshot()
			const screenshot = screenshotBuffer.toString('base64')
			page.close()
			await db.run(
				'REPLACE INTO screenshots (id, screenshot, hash) VALUES (?, ?, ?)',
				id,
				screenshot,
				hash
			)
			cb(screenshot)

			// eslint-disable-next-line
			if (this.debug) console.log('done')
		}
	}

	async addSnapshotToScreenshotQueue(id: string, hash: string, cb: (screenshot: string) => void) {
		const { queue } = this
		queue.push({ id, hash, cb })

		if (queue.length === 1) {
			this.processNextInQueue()
		}
	}

	async getScreenshot(id: string, snapshot: TLStoreSnapshot, hash: string) {
		console.log('screenshot requested', id, snapshot, hash)

		// eslint-disable-next-line
		if (this.debug) console.log('Getting screenshot from db', id)
		const { db } = this

		const existingScreenshot = await this.getScreenshotFromDbByHash(hash)

		if (existingScreenshot) {
			// eslint-disable-next-line
			if (this.debug) console.log('Screenshot from db using hash', id)
			return existingScreenshot.screenshot
		}

		// Save the snapshot to the database
		await db.run(
			'REPLACE INTO snapshots (id, snapshot, hash) VALUES (?, ?, ?)',
			id,
			JSON.stringify(snapshot),
			hash
		)

		// Get screenshot (by loading the page in the react app, then taking a screenshot of the page with playwright)
		const screenshot = await new Promise((r) => this.addSnapshotToScreenshotQueue(id, hash, r))
		// Now delete the item from the database, we don't need it anymore
		await db.run('DELETE FROM snapshots WHERE id = ?', id)

		// eslint-disable-next-line
		if (this.debug) console.log('Screenshot from db', id)
		return screenshot
	}

	async getSnapshotFromDb(id: string) {
		const { db } = this
		const { snapshot } = await db.get('SELECT * FROM snapshots WHERE id = ?', id)

		// eslint-disable-next-line
		if (this.debug) console.log('Snapshot from db', id)
		return snapshot
	}

	async getScreenshotFromDb(id: string) {
		const { db } = this
		const res = await db.get('SELECT * FROM screenshots WHERE id = ?', id)

		// eslint-disable-next-line
		if (this.debug) console.log('Screenshot from db', id)
		return res.screenshot
	}

	async getScreenshotFromDbByHash(hash: string) {
		const { db } = this
		const res = await db.get('SELECT * FROM screenshots WHERE hash = ?', hash)

		// eslint-disable-next-line
		if (this.debug) console.log('Screenshot from db using hash', hash)
		return res.screenshot
	}

	static async create() {
		const db = await open({
			filename: '/tmp/database.db',
			driver: sqlite3.Database,
		})
		const browser = await chromium.launch()
		const manager = new TldrawScreenshotManager(browser, db)
		await manager.setup()
		return manager
	}
}
