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

const averages = new Map<any, { total: number; count: number }>()

/** @internal */
export function measureAverageDuration(
	_target: any,
	propertyKey: string,
	descriptor: PropertyDescriptor
) {
	const originalMethod = descriptor.value
	descriptor.value = function (...args: any[]) {
		const start = performance.now()
		const result = originalMethod.apply(this, args)
		const end = performance.now()
		const length = end - start
		if (length !== 0) {
			const value = averages.get(descriptor.value)!
			const total = value.total + length
			const count = value.count + 1
			averages.set(descriptor.value, { total, count })
			// eslint-disable-next-line no-console
			console.log(
				`${propertyKey} took ${(end - start).toFixed(2)}ms | average ${(total / count).toFixed(2)}ms`
			)
		}
		return result
	}
	averages.set(descriptor.value, { total: 0, count: 0 })
	return descriptor
}
