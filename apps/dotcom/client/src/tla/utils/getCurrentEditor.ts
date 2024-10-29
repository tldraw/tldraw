import { Editor } from 'tldraw'

export function getCurrentEditor() {
	return (window as any).editor as Editor | undefined
}
