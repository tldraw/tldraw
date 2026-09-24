// wawoff2 ships no types; only the decompressor is used, by the native text export test.
declare module 'wawoff2' {
	export function compress(data: Uint8Array): Promise<Uint8Array>
	export function decompress(data: Uint8Array): Promise<Uint8Array>
}
