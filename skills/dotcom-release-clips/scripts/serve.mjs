#!/usr/bin/env node
// Serve a built examples app on 127.0.0.1, falling back to index.html for client routes like
// /develop.
//
//   node serve.mjs <dir> <port>
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

const [dir, port] = process.argv.slice(2)
if (!dir || !port) {
	console.error('Usage: node serve.mjs <dir> <port>')
	process.exit(1)
}
const root = path.resolve(dir)
const types = {
	'.html': 'text/html',
	'.js': 'text/javascript',
	'.css': 'text/css',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.json': 'application/json',
	'.woff': 'font/woff',
	'.woff2': 'font/woff2',
	'.wasm': 'application/wasm',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
}

http
	.createServer((req, res) => {
		let file = path.join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname))
		// path.join resolves `..`, so anything outside root falls back to the app
		if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
			file = path.join(root, 'index.html')
		}
		res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream' })
		fs.createReadStream(file).pipe(res)
	})
	.listen(Number(port), '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${port}`))
