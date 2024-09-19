/** @public */
export const runtime: {
	openWindow(url: string, target: string): void
	refreshPage(): void
	hardReset(): void
} = {
	openWindow(url, target) {
		window.open(url, target, 'noopener noreferrer')
	},
	refreshPage() {
		window.location.reload()
	},
	async hardReset() {
		return await (window as any).__tldraw__hardReset?.()
	},
}

/** @public */
export function setRuntimeOverrides(input: Partial<typeof runtime>) {
	Object.assign(runtime, input)
}
