export { Unpackr, Decoder, unpack, decode, addExtension, FLOAT32_OPTIONS, clearSource } from './unpack'
import { Options } from './unpack'
export { Packr, Encoder, pack, encode } from './pack'
import { Transform, Readable } from 'stream'

export as namespace msgpackr;
export class UnpackrStream extends Transform {
	constructor(options?: Options | { highWaterMark: number, emitClose: boolean, allowHalfOpen: boolean })
}
export class PackrStream extends Transform {
	constructor(options?: Options | { highWaterMark: number, emitClose: boolean, allowHalfOpen: boolean })
}
