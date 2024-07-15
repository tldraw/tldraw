import console from 'console'
import cors from 'cors'
import express from 'express'
import path from 'path'
import { chromium } from 'playwright'
import { open } from 'sqlite'
import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory

open({
	filename: '/tmp/database.db',
	driver: sqlite3.Database,
}).then(async (db) => {
	// Create a table of snapshots, with snapshots being JSON blobs
	await db.run('DROP TABLE IF EXISTS snapshots')
	await db.run('CREATE TABLE snapshots (id TEXT PRIMARY KEY, snapshot TEXT)')

	// Create a table of base64 screenshots with screenshots being base64 strings
	await db.run('DROP TABLE IF EXISTS screenshots')
	await db.run('CREATE TABLE screenshots (id TEXT PRIMARY KEY, screenshot TEXT)')

	// Create the express app
	const app = express().use(
		cors({
			origin: '*',
			methods: 'POST',
			allowedHeaders: ['Content-Type'],
		}),
		express.json()
	)

	// Serve the react app
	// app.use(express.static(path.join(__dirname, '../dist')))

	// The handler for screenshot queue
	const browser = await chromium.launch()
	const queue: (() => Promise<void>)[] = []
	async function processNextInQueue() {
		if (queue.length > 1) return
		while (queue.length) {
			const fn = queue.shift()
			if (!fn) continue
			await fn()
		}
	}

	// The thumbnail endpoint
	app.post('/thumbnail', async (req, res) => {
		try {
			const { id, snapshot } = req.body
			if (!snapshot) return res.status(400).json({ error: 'Snapshot is required' })

			// A row already exists there, perhaps we need a hash to identify whether it's the same one?
			const row = await db.get('SELECT * FROM snapshots WHERE id = ?', id)
			if (!row) {
				// Put the snapshot into the database so that the app can find it
				await db.run(
					'INSERT INTO snapshots (id, snapshot) VALUES (?, ?)',
					id,
					JSON.stringify(snapshot)
				)
			}

			// Add a task to the queue to take a screenshot of the snapshot
			queue.push(async () => {
				// open the page, wait for the content, and take a screenshot
				const page = await browser.newPage()
				await page.goto(`localhost:5001/file/${id}`)
				await page.waitForSelector('.tl-container')
				const screenshotBuffer = await page.screenshot()
				const screenshot = screenshotBuffer.toString('base64')
				page.close()
				// delete any prior screenshot
				await db.run('DELETE FROM screenshots WHERE id = ?', id)
				// add the new screenshot as a base64 string
				await db.run('INSERT INTO screenshots (id, screenshot) VALUES (?, ?)', id, screenshot)
				// respond to the client
				res.json({ message: 'Screenshot saved', id, screenshot })
			})

			// Start processing the queue, if we can
			processNextInQueue()
		} catch (e) {
			console.error(e)
			return res.status(500).json({ error: 'Internal server error' })
		}
		return
	})

	app.post('/snapshot', async (req, res) => {
		try {
			const { fileId } = req.body
			if (!fileId) return res.status(400).json({ error: 'Snapshot id is required' })
			const { snapshot } = await db.get('SELECT * FROM snapshots WHERE id = ?', fileId)
			if (!snapshot) return res.status(404).json({ error: 'Snapshot not found' })
			res.json({ message: 'Snapshot', snapshot })
		} catch (e) {
			console.error(e)
			return res.status(500).json({ error: 'Internal server error' })
		}
		return
	})

	app.get('/screenshot', async (req, res) => {
		try {
			const { fileId } = req.body
			if (!fileId) return res.status(400).json({ error: 'File id is required' })
			const { screenshot } = await db.get('SELECT * FROM screenshots WHERE id = ?', fileId)
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
