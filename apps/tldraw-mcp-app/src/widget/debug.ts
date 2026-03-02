export const debugLines: string[] = []

export function log(msg: string) {
	debugLines.push(`${new Date().toISOString().slice(11, 23)} ${msg}`)
	const el = document.getElementById('debug')
	if (el) el.textContent = debugLines.join('\n')
}

window.addEventListener('error', (e) => log(`ERROR: ${e.message}`))
window.addEventListener('unhandledrejection', (e) => log(`REJECTION: ${e.reason}`))
