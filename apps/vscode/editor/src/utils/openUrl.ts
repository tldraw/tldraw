import { vscode } from './vscode'

export function openUrl(url: string) {
	vscode.postMessage({
		type: 'vscode:open-window',
		data: { url, target: '_blank' },
	})
}
