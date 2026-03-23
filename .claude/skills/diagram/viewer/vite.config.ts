import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readFile, readdir } from 'fs/promises'

// tmp/diagrams/ lives at the repo root (4 levels up from viewer/)
const diagramsDir = path.resolve(__dirname, '../../../../tmp/diagrams')

function serveDiagrams(): Plugin {
	return {
		name: 'serve-diagrams',
		configureServer(server) {
			server.middlewares.use(async (req, res, next) => {
				const url = (req.url || '').split('?')[0]

				// Serve list of all .mmd files
				if (url === '/diagrams/index.json') {
					try {
						const files = await readdir(diagramsDir)
						const mmds = files.filter((f) => f.endsWith('.mmd')).sort()
						res.setHeader('Content-Type', 'application/json')
						res.setHeader('Cache-Control', 'no-store')
						res.end(JSON.stringify(mmds))
					} catch {
						res.setHeader('Content-Type', 'application/json')
						res.setHeader('Cache-Control', 'no-store')
						res.end('[]')
					}
					return
				}

				// Serve individual .mmd files
				const match = url.match(/^\/diagrams\/(.+\.mmd)$/)
				if (match) {
					try {
						const content = await readFile(path.join(diagramsDir, match[1]), 'utf-8')
						res.setHeader('Content-Type', 'text/plain')
						res.setHeader('Cache-Control', 'no-store')
						res.end(content)
					} catch {
						res.statusCode = 404
						res.end('')
					}
					return
				}

				next()
			})
		},
	}
}

export default defineConfig({
	plugins: [react(), serveDiagrams()],
	server: {
		port: 5799,
		open: false,
	},
})
