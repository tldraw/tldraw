import cors from 'cors'
import express from 'express'
import { TldrawScreenshotManager } from './TldrawScreenshotManager'

async function main() {
	// Create the screenshot manager, which is used to generate (playwright) and store (sqlite) screenshots
	const manager = await TldrawScreenshotManager.create()

	// Create the express app
	const app = express().use(
		cors({
			origin: '*',
			methods: ['POST'],
			allowedHeaders: ['Content-Type'],
		}),
		express.json()
	)

	/* -------------------- Thumbnail ------------------- */

	// Get a new thumbnail for a snapshot. This endpoint is used by the react app to
	// generate a new thumbnail. The react app sends the snapshot, and the server uses
	// playwright to load the page and take a screenshot. If the snapshot hash is the same
	// as the one in the database, the server returns the screenshot from the database.
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

	/* -------------------- Snapshot -------------------- */

	// Used to get a snapshot from the database. This isn't called by the regular application,
	// but is instead used by the react app to ge the snapshot for a file so that it can load it
	// in the editor. Once the editor is loaded, the playwright browser takes the screenshot.
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

	/* ------------------- Screenshot ------------------- */

	// Get a screenshot from the database without having to load the page in the react app.
	// The screenshot might be stale, as this endpoint doesn't try to generate a new one or
	// do any checking using the snapshot hash.
	app.get('/screenshot', async (req, res) => {
		try {
			const { fileId } = req.body
			if (!fileId) return res.status(400).json({ error: 'File id is required' })
			const screenshot = await manager.getScreenshotFromDb(fileId)
			console.log(screenshot)
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
}

main()
