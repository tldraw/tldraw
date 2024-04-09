export function interval(cb: () => void, timeout: number) {
	const i = setInterval(cb, timeout)
	return () => clearInterval(i)
}
