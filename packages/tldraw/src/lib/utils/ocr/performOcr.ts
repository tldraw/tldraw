// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - tesseract-wasm exports map doesn't include types
import { createOCREngine, type OCREngine } from 'tesseract-wasm'

const SUPPORTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

const CDN_BASE = 'https://cdn.jsdelivr.net/npm/tesseract-wasm@0.11.0/dist'
const WASM_URL = `${CDN_BASE}/tesseract-core.wasm`
const MODEL_URL =
	'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/eng.traineddata'

let enginePromise: Promise<OCREngine> | null = null

function getEngine() {
	if (!enginePromise) {
		enginePromise = (async () => {
			const [wasmBinary, modelBinary] = await Promise.all([
				fetch(WASM_URL).then((r) => r.arrayBuffer()),
				fetch(MODEL_URL).then((r) => r.arrayBuffer()),
			])
			const engine = await createOCREngine({ wasmBinary })
			engine.loadModel(modelBinary)
			return engine
		})()
	}
	return enginePromise
}

export async function performOcr(file: File): Promise<string | null> {
	if (!SUPPORTED_TYPES.has(file.type)) return null

	const bitmap = await createImageBitmap(file)
	try {
		const engine = await getEngine()
		engine.loadImage(bitmap)
		const text = engine.getText()
		return text.trim() || null
	} finally {
		bitmap.close()
	}
}
