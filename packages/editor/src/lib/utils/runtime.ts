/** @public */
export const runtime: {
	openWindow(url: string, target: string, allowReferrer?: boolean): void
	refreshPage(): void
	hardReset(): void
} = {
	openWindow(url, target, allowReferrer = false) {
		return window.open(url, target, allowReferrer ? 'noopener' : 'noopener noreferrer')
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
