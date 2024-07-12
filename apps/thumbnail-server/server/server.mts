import cors from 'cors'
import express from 'express'
import path from 'path'
import { chromium } from 'playwright'
import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url) // get the resolved path to the file
const __dirname = path.dirname(__filename) // get the name of the directory

const db = new sqlite3.Database(':memory:')

db.serialize(() => {
	// Create a table of snapshots, with snapshots being JSON blobs
	db.run('CREATE TABLE snapshots (id TEXT PRIMARY KEY, screenshot TEXT)')

	// Create a table of base64 screenshots with screenshots being base64 strings
	db.run('CREATE TABLE screenshots (id TEXT PRIMARY KEY, screenshot TEXT)')
})

// Server:
// Receive a POST message with tldraw snapshot in the body
// Save the tldraw snapshot to the database under an id
// In playwright, load the route for the file with the snapshot id
// Wait for the ready message from the tldraw editor

// Frontend:
// In the route, load the snapshot from the database
// Put the snapshot into the tldraw editor
// When the tldraw editor is ready, post the ready message

// Server:
// When the ready message is received, take a screenshot
// Return the screenshot as a base64 string (for now)

let id = 0

const app = express()
app.use(cors())
app.use(express.json())

// Serve the react app
app.use(express.static(path.join(__dirname, '../dist')))

const browser = await chromium.launch()
const page = await browser.newPage()

// The thumbnail endpoint
app.post('/thumbnail', async (req, res) => {
	const { snapshot } = req.body
	if (!snapshot) {
		return res.status(400).json({ error: 'Snapshot is required' })
	}

	console.log('Received snapshot')

	// Get the next id
	id++

	// Save the snapshot to the database
	db.run('INSERT INTO snapshots (id, snapshot) VALUES (?, ?)', id, snapshot)

	// In Chromium, visit the page with the snapshot
	await page.goto(`localhost:5002/file/${id}`)

	const screenshotBuffer = await page.screenshot()
	// await browser.close()

	// const screenshot = new Screenshot({ url, screenshot: screenshotBuffer })
	// await screenshot.save()

	res.json({ message: 'Screenshot saved', id })

	return
})

app.post('/snapshot', async (req, res) => {
	const { fileId } = req.body
	if (!fileId) {
		return res.status(400).json({ error: 'Snapshot id is required' })
	}

	// Get the snapshot from the database
	const snapshot = db.get('SELECT * FROM snapshots WHERE id = ?', fileId)

	if (!snapshot) {
		return res.status(404).json({ error: 'Snapshot not found' })
	}

	res.json({ message: 'Snapshot', snapshot })
	return
})

app.listen(5002, () => {
	console.log('Server is running on port 5002')
})
