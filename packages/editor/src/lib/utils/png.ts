import { crc } from './crc'

export function isPng(view: DataView, offset: number) {
	if (
		view.getUint8(offset + 0) === 0x89 &&
		view.getUint8(offset + 1) === 0x50 &&
		view.getUint8(offset + 2) === 0x4e &&
		view.getUint8(offset + 3) === 0x47 &&
		view.getUint8(offset + 4) === 0x0d &&
		view.getUint8(offset + 5) === 0x0a &&
		view.getUint8(offset + 6) === 0x1a &&
		view.getUint8(offset + 7) === 0x0a
	) {
		return true
	}
	return false
}

function getChunkType(view: DataView, offset: number) {
	return [
		String.fromCharCode(view.getUint8(offset)),
		String.fromCharCode(view.getUint8(offset + 1)),
		String.fromCharCode(view.getUint8(offset + 2)),
		String.fromCharCode(view.getUint8(offset + 3)),
	].join('')
}

const LEN_SIZE = 4
const CRC_SIZE = 4

export function readChunks(view: DataView, offset = 0) {
	const chunks: Record<string, { dataOffset: number; size: number; start: number }> = {}
	if (!isPng(view, offset)) {
		throw new Error('Not a PNG')
	}
	offset += 8

	while (offset <= view.buffer.byteLength) {
		const start = offset
		const len = view.getInt32(offset)
		offset += 4
		const chunkType = getChunkType(view, offset)

		if (chunkType === 'IDAT' && chunks[chunkType]) {
			offset += len + LEN_SIZE + CRC_SIZE
			continue
		}

		if (chunkType === 'IEND') {
			break
		}

		chunks[chunkType] = {
			start,
			dataOffset: offset + 4,
			size: len,
		}
		offset += len + LEN_SIZE + CRC_SIZE
	}

	return chunks
}

export function parsePhys(view: DataView, offset: number) {
	return {
		ppux: view.getUint32(offset),
		ppuy: view.getUint32(offset + 4),
		unit: view.getUint8(offset + 4),
	}
}

export function findChunk(view: DataView, type: string) {
	const chunks = readChunks(view)
	return chunks[type]
}

export function setPhysChunk(view: DataView, dpr = 1, options?: BlobPropertyBag) {
	let offset = 46
	let size = 0
	const res1 = findChunk(view, 'pHYs')
	if (res1) {
		offset = res1.start
		size = res1.size
	}

	const res2 = findChunk(view, 'IDAT')
	if (res2) {
		offset = res2.start
		size = 0
	}

	const pHYsData = new ArrayBuffer(21)
	const pHYsDataView = new DataView(pHYsData)

	pHYsDataView.setUint32(0, 9)

	pHYsDataView.setUint8(4, 'p'.charCodeAt(0))
	pHYsDataView.setUint8(5, 'H'.charCodeAt(0))
	pHYsDataView.setUint8(6, 'Y'.charCodeAt(0))
	pHYsDataView.setUint8(7, 's'.charCodeAt(0))

	const DPI_96 = 2835.5

	pHYsDataView.setInt32(8, DPI_96 * dpr)
	pHYsDataView.setInt32(12, DPI_96 * dpr)
	pHYsDataView.setInt8(16, 1)

	const crcBit = new Uint8Array(pHYsData.slice(4, 17))
	pHYsDataView.setInt32(17, crc(crcBit))

	const startBuf = view.buffer.slice(0, offset)
	const endBuf = view.buffer.slice(offset + size)

	return new Blob([startBuf, pHYsData, endBuf], options)
}
