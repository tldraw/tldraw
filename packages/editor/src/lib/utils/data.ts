import { isPlainObject } from 'is-plain-object'
import { nanoid } from 'nanoid'

/**
 * Generate a unique id.
 *
 * @example
 *
 * ```ts
 * const id = uniqueId()
 * ```
 *
 * @public
 */
export function uniqueId() {
	return nanoid()
}

const serializableTypes = new Set(['string', 'number', 'boolean', 'undefined'])

/**
 * Get whether a value is serializable.
 *
 * @example
 *
 * ```ts
 * const A = isSerializable(1) // true
 * const B = isSerializable('a') // true
 * const C = isSerializable(true) // true
 * const D = isSerializable(undefined) // false
 * ```
 *
 * @param value - The value to check.
 * @public
 */
export function isSerializable(value: any): boolean {
	if (serializableTypes.has(typeof value) || value === null) return true
	if (Array.isArray(value)) return value.every(isSerializable)
	if (isPlainObject(value)) return Object.values(value).every(isSerializable)
	return false
}

/**
 * Convert a file to base64.
 *
 * @example
 *
 * ```ts
 * const A = fileToBase64('./test.png')
 * ```
 *
 * @param value - The file as a blob.
 * @public
 */
export function fileToBase64(file: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		if (file) {
			const reader = new FileReader()
			reader.readAsDataURL(file)
			reader.onload = () => resolve(reader.result as string)
			reader.onerror = (error) => reject(error)
			reader.onabort = (error) => reject(error)
		}
	})
}

/**
 * Get an incremented name (e.g. New page (2)) from a name (e.g. New page), based on an array of
 * existing names.
 *
 * @param name - The name to increment.
 * @param others - The array of existing names.
 * @public
 */
export function getIncrementedName(name: string, others: string[]) {
	let result = name
	const set = new Set(others)

	while (set.has(result)) {
		result = /^.*(\d+)$/.exec(result)?.[1]
			? result.replace(/(\d+)(?=\D?)$/, (m) => {
					return (+m + 1).toString()
			  })
			: `${result} 1`
	}

	return result
}

/** @public */
export const checkFlag = (flag: boolean | (() => boolean) | undefined) =>
	typeof flag === 'boolean' ? flag : flag?.()

/** @public */
export function snapToGrid(n: number, gridSize: number) {
	return Math.round(n / gridSize) * gridSize
}

const VALID_URL_REGEX = new RegExp(
	/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:[/?#]\S*)?$/i
)

/** @public */
export function isValidUrl(url: string) {
	return VALID_URL_REGEX.test(url)
}
