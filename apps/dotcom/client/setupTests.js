global.crypto ??= new (require('@peculiar/webcrypto').Crypto)()

process.env.MULTIPLAYER_SERVER = 'https://localhost:8787'
process.env.ASSET_UPLOAD = 'https://localhost:8788'
process.env.IMAGE_WORKER = 'https://images.tldraw.xyz'
process.env.FAIRY_WORKER = 'https://localhost:8789'
process.env.TLDRAW_ENV = 'test'
process.env.ZERO_SERVER = 'http://localhost:4848'

global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder

// Float16Array polyfill for tests (Float16Array was added in Node.js 20.10.0)
if (typeof globalThis.Float16Array === 'undefined') {
	const { Float16Array } = require('@petamoriken/float16')
	globalThis.Float16Array = Float16Array
}
