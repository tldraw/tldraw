import { linksUiOverrides } from './utils/links'
// eslint-disable-next-line import/no-internal-modules
import '@tldraw/tldraw/tldraw.css'
// eslint-disable-next-line import/no-internal-modules
import { getAssetUrlsByImport } from '@tldraw/assets/imports'
import { Editor, ErrorBoundary, TLUiMenuSchema, Tldraw, setRuntimeOverrides } from '@tldraw/tldraw'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { VscodeMessage } from '../../messages'
import '../public/index.css'
import { ChangeResponder } from './ChangeResponder'
import { FileOpen } from './FileOpen'
import { FullPageMessage } from './FullPageMessage'
import { onCreateAssetFromUrl } from './utils/bookmarks'
import { vscode } from './utils/vscode'

setRuntimeOverrides({
	openWindow: (url, target) => {
		vscode.postMessage({
			type: 'vscode:open-window',
			data: {
				url,
				target,
			},
		})
	},
	refreshPage: () => {
		vscode.postMessage({
			type: 'vscode:refresh-page',
		})
	},
	hardReset: async () => {
		await (window as any).__tldraw__hardReset?.()
		vscode.postMessage({
			type: 'vscode:hard-reset',
		})
	},
})

const handleError = (error: any) => {
	console.error(error.message)
}

export function WrappedTldrawEditor() {
	return (
		<div className="tldraw--editor">
			<ErrorBoundary
				fallback={() => <FullPageMessage>Fallback</FullPageMessage>}
				onError={handleError}
			>
				<TldrawWrapper />
			</ErrorBoundary>
		</div>
	)
}

const menuOverrides = {
	menu: (_editor: Editor, schema: TLUiMenuSchema, _helpers: any) => {
		schema.forEach((item) => {
			if (item.id === 'menu' && item.type === 'group') {
				item.children = item.children.filter((menuItem) => {
					if (!menuItem) return false
					if (menuItem.id === 'file' && menuItem.type === 'submenu') {
						return false
					}
					return true
				})
			}
		})

		return schema
	},
}

export const TldrawWrapper = () => {
	const [tldrawInnerProps, setTldrawInnerProps] = useState<TLDrawInnerProps | null>(null)

	useEffect(() => {
		function handleMessage({ data: message }: MessageEvent<VscodeMessage>) {
			switch (message.type) {
				case 'vscode:opened-file': {
					setTldrawInnerProps({
						assetSrc: message.data.assetSrc,
						fileContents: message.data.fileContents,
						uri: message.data.uri,
						isDarkMode: message.data.isDarkMode,
					})
					// We only want to listen for this message once
					window.removeEventListener('message', handleMessage)
					break
				}
			}
		}

		window.addEventListener('message', handleMessage)

		vscode.postMessage({ type: 'vscode:ready-to-receive-file' })

		return () => {
			window.removeEventListener('message', handleMessage)
		}
	}, [setTldrawInnerProps])

	return tldrawInnerProps === null ? (
		<FullPageMessage>Loading</FullPageMessage>
	) : (
		<TldrawInner {...tldrawInnerProps} />
	)
}

export type TLDrawInnerProps = {
	assetSrc: string
	fileContents: string
	uri: string
	isDarkMode: boolean
}

function TldrawInner({ uri, assetSrc, isDarkMode, fileContents }: TLDrawInnerProps) {
	const assetUrls = useMemo(() => getAssetUrlsByImport({ baseUrl: assetSrc }), [assetSrc])

	const handleMount = useCallback((editor: Editor) => {
		editor.registerExternalAssetHandler('url', onCreateAssetFromUrl)
	}, [])

	return (
		<Tldraw
			assetUrls={assetUrls}
			persistenceKey={uri}
			onMount={handleMount}
			overrides={[menuOverrides, linksUiOverrides]}
			autoFocus
		>
			{/* <DarkModeHandler themeKind={themeKind} /> */}
			<FileOpen fileContents={fileContents} forceDarkMode={isDarkMode} />
			<ChangeResponder />
		</Tldraw>
	)
}
