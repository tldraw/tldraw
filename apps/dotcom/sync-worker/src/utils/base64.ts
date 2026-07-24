// Chunked base64 helpers. String.fromCharCode(...bytes) overflows the engine's argument limit on
// large buffers (a PNG screenshot is megabytes), so encoding walks the bytes in 32k chunks.

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
	return btoa(bytesToBinaryString(new Uint8Array(buffer)))
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
	return binaryStringToBytes(atob(base64)).buffer
}

// Base64url (RFC 4648 §5): the URL-safe alphabet with padding stripped, used for the signed
// render tokens that ride in the render page's query string.
export function base64UrlEncode(bytes: Uint8Array): string {
	return btoa(bytesToBinaryString(bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function base64UrlDecode(value: string): Uint8Array<ArrayBuffer> {
	return binaryStringToBytes(atob(value.replace(/-/g, '+').replace(/_/g, '/')))
}

function bytesToBinaryString(bytes: Uint8Array): string {
	let binary = ''
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
	}
	return binary
}

function binaryStringToBytes(binary: string): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(new ArrayBuffer(binary.length))
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i)
	}
	return bytes
}
