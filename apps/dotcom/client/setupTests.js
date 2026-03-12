global.crypto ??= new (require('@peculiar/webcrypto').Crypto)()

process.env.MULTIPLAYER_SERVER = 'https://localhost:8787'
process.env.TLDRAW_ENV = 'test'
process.env.USER_CONTENT_URL = 'https://tldrawusercontent.com'
process.env.ZERO_SERVER = 'http://localhost:4848'

global.TextEncoder = require('util').TextEncoder
global.TextDecoder = require('util').TextDecoder
