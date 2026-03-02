import type { App } from '@modelcontextprotocol/ext-apps/react'
import type { TLAssetStore } from 'tldraw'
import { log } from './debug'

export function createR2AssetStore(app: App, getToken: () => Promise<string | null>): TLAssetStore {
	return {
		async upload(asset, file) {
			const arrayBuffer = await file.arrayBuffer()
			const bytes = new Uint8Array(arrayBuffer)
			let binary = ''
			for (let i = 0; i < bytes.length; i++) {
				binary += String.fromCharCode(bytes[i])
			}
			const base64 = btoa(binary)

			try {
				const token = await getToken()
				const args: Record<string, string> = {
					filename: file.name || 'image',
					base64,
					contentType: file.type || 'image/png',
				}
				if (token) args.clerkToken = token

				const result = await app.callServerTool({
					name: 'upload_image',
					arguments: args,
				})

				const sc = result?.structuredContent as Record<string, unknown> | undefined
				if (sc?.imageUrl && typeof sc.imageUrl === 'string') {
					log(`Uploaded image to storage: ${sc.imageUrl}`)
					return { src: sc.imageUrl }
				}
			} catch (err) {
				log(`upload_image failed: ${err instanceof Error ? err.message : err}`)
			}

			// Fallback: store as data URL if upload fails or upload_image tool is unavailable
			log('Falling back to data URL for image')
			return {
				src: await new Promise<string>((resolve) => {
					const reader = new FileReader()
					reader.onload = () => resolve(reader.result as string)
					reader.readAsDataURL(file)
				}),
			}
		},

		resolve(asset) {
			return asset.props.src
		},
	}
}
