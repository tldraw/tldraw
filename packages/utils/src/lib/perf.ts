/** @internal */
export function measureCbDuration(name: string, cb: () => any) {
	const now = performance.now()
	const result = cb()
	// eslint-disable-next-line no-console
	console.log(`${name} took`, performance.now() - now, 'ms')
	return result
}

/** @internal */
export function measureDuration(_target: any, propertyKey: string, descriptor: PropertyDescriptor) {
	const originalMethod = descriptor.value
	descriptor.value = function (...args: any[]) {
		const start = performance.now()
		const result = originalMethod.apply(this, args)
		const end = performance.now()
		// eslint-disable-next-line no-console
		console.log(`${propertyKey} took ${end - start}ms `)
		return result
	}
	return descriptor
}
