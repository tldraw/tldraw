export function getFileUrl(fileId: string): string {
	return `/q/f/${fileId.split(':').pop()}`
}
