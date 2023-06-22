// see: https://github.com/mesqueeb/is-what/blob/88d6e4ca92fb2baab6003c54e02eedf4e729e5ab/src/index.ts

function getType(value: any): string {
	return Object.prototype.toString.call(value).slice(8, -1)
}

export function isPlainObject(value: any): value is Record<string, any> {
	if (getType(value) !== 'Object') {
		return false
	}

	return value.constructor === Object && Object.getPrototypeOf(value) === Object.prototype
}

export function mergeDeep(
	target: Record<string, any>,
	source: Record<string, any>
): Record<string, any> {
	const output = { ...target }

	if (isPlainObject(target) && isPlainObject(source)) {
		Object.keys(source).forEach((key) => {
			if (isPlainObject(source[key])) {
				if (!(key in target)) {
					Object.assign(output, { [key]: source[key] })
				} else {
					output[key] = mergeDeep(target[key], source[key])
				}
			} else {
				Object.assign(output, { [key]: source[key] })
			}
		})
	}

	return output
}

type ExtractStorage<E extends EditorExtension> = E extends EditorExtension<infer _, infer S>
	? Record<E['name'] extends any ? E['name'] : never, S>
	: never
