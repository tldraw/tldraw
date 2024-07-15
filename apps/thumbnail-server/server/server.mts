import console from 'console'
import cors from 'cors'
import express from 'express'
import path from 'path'
import { Browser, chromium } from 'playwright'
import { Database, open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { TLStoreSnapshot } from 'tldraw'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory

class TldrawScreenshotManager {
	db: Database
	browser: Browser
	queue: { id: string; hash: string; cb: (screenshot: string) => void }[] = []
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
		if (this.debug) console.log('Getting screenshot from db', id)
		const { db } = this

		const existingScreenshot = await this.getScreenshotFromDbByHash(hash)
		if (existingScreenshot) {
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
		if (this.debug) console.log('Screenshot from db', id)
		return screenshot
	}

	async getSnapshotFromDb(id: string) {
		const { db } = this
		const { snapshot } = await db.get('SELECT * FROM snapshots WHERE id = ?', id)
		if (this.debug) console.log('Snapshot from db', id)
		return snapshot
	}

	async getScreenshotFromDb(id: string) {
		const { db } = this
		const { screenshot } = await db.get('SELECT * FROM screenshots WHERE id = ?', id)
		if (this.debug) console.log('Screenshot from db', id)
		return screenshot
	}

	async getScreenshotFromDbByHash(hash: string) {
		const { db } = this
		const { screenshot } = await db.get('SELECT * FROM screenshots WHERE hash = ?', hash)
		if (this.debug) console.log('Screenshot from db using hash', hash)
		return screenshot
	}
}

open({
	filename: '/tmp/database.db',
	driver: sqlite3.Database,
}).then(async (db) => {
	const browser = await chromium.launch()
	const manager = new TldrawScreenshotManager(browser, db)
	await manager.setup()

	// Create the express app
	const app = express().use(
		cors({
			origin: '*',
			methods: ['POST', 'GET'],
			allowedHeaders: ['Content-Type'],
		}),
		express.json()
	)

	// The thumbnail endpoint
	app.post('/thumbnail', async (req, res) => {
		try {
			const { id, snapshot, hash } = req.body
			if (!snapshot) return res.status(400).json({ error: 'Snapshot is required' })
			const screenshot = await manager.getScreenshot(id, snapshot, hash)
			res.json({ message: 'Screenshot', screenshot })
		} catch (e) {
			console.error(e)
			return res.status(500).json({ error: 'Internal server error' })
		}
		return
	})

	// Snapshot endpoint
	// Used to get a snapshot from the database. The react app gets this, then loads
	// it in the editor. Once the editor is loaded, the playwright browser takes the screenshot.
	app.post('/snapshot', async (req, res) => {
		try {
			const { fileId } = req.body
			if (!fileId) return res.status(400).json({ error: 'Snapshot id is required' })
			const snapshot = await manager.getSnapshotFromDb(fileId)
			if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' })
			res.json({ message: 'Snapshot', snapshot })
		} catch (e) {
			console.error(e)
			return res.status(500).json({ error: 'Internal server error' })
		}
		return
	})

	// Screenshot endpoint
	// Used to get a screenshot from the database. The application requests this.
	app.get('/screenshot', async (req, res) => {
		try {
			const { fileId } = req.body
			if (!fileId) return res.status(400).json({ error: 'File id is required' })
			const screenshot = await manager.getScreenshotFromDb(fileId)
			if (!screenshot) return res.status(404).json({ error: 'Screenshot not found' })
			res.json({ message: 'Screenshot', screenshot })
		} catch (e) {
			console.error(e)
			return res.status(500).json({ error: 'Internal server error' })
		}
		return
	})

	app.listen(5002, () => {
		console.log('Server is running on port 5002')
	})
})
