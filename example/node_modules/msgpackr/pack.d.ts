import { Unpackr } from './unpack'
export { addExtension, FLOAT32_OPTIONS } from './unpack'
export class Packr extends Unpackr {
	pack(value: any): Buffer
	encode(value: any): Buffer
}
export class Encoder extends Packr {}
export function pack(value: any): Buffer
export function encode(value: any): Buffer
