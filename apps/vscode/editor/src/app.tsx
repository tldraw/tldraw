import {
	App,
	DEFAULT_SHAPE_UTILS,
	DEFAULT_TOOLS,
	ErrorBoundary,
	TldrawEditor,
	TldrawEditorCanvas,
	createDefaultTldrawEditorStore,
	setRuntimeOverrides,
} from '@tldraw/editor'
import { linksUiOverrides } from './utils/links'
// eslint-disable-next-line import/no-internal-modules
import '@tldraw/editor/editor.css'
import { TAB_ID, useLocalSyncClient } from '@tldraw/tlsync-client'
import { MenuSchema, TldrawEditorUi, TldrawEditorUiContextMenu } from '@tldraw/ui'
// eslint-disable-next-line import/no-internal-modules
import { getAssetUrlsByImport } from '@tldraw/assets/imports'
// eslint-disable-next-line import/no-internal-modules
import '@tldraw/ui/ui.css'
import { useEffect, useMemo, useState } from 'react'
import { VscodeMessage } from '../../messages'
import '../public/index.css'
import { ChangeResponder } from './ChangeResponder'
import { FileOpen } from './FileOpen'
import { FullPageMessage } from './FullPageMessage'
import { onCreateBookmarkFromUrl } from './utils/bookmarks'
import { vscode } from './utils/vscode'

const store = createDefaultTldrawEditorStore()

// @ts-ignore

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
	menu: (_app: App, schema: MenuSchema, _helpers: any) => {
		schema.forEach((item) => {
			if (item.id === 'menu' && item.type === 'group') {
				item.children = item.children.filter((menuItem) => {
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
	const instanceId = TAB_ID

	const syncedStore = useLocalSyncClient({
		universalPersistenceKey: uri,
		instanceId,
		store, // created outside of react scope
	})

	const assetUrls = useMemo(() => getAssetUrlsByImport({ baseUrl: assetSrc }), [assetSrc])

	return (
		<TldrawEditor
			assetUrls={assetUrls}
			instanceId={TAB_ID}
			shapes={DEFAULT_SHAPE_UTILS}
			tools={DEFAULT_TOOLS}
			store={syncedStore}
			onCreateBookmarkFromUrl={onCreateBookmarkFromUrl}
			autoFocus
		>
			{/* <DarkModeHandler themeKind={themeKind} /> */}
			<TldrawEditorUi assetUrls={assetUrls} overrides={[menuOverrides, linksUiOverrides]}>
				<FileOpen instanceId={instanceId} fileContents={fileContents} forceDarkMode={isDarkMode} />
				<ChangeResponder syncedStore={syncedStore} instanceId={instanceId} />
				<TldrawEditorUiContextMenu>
					<TldrawEditorCanvas />
				</TldrawEditorUiContextMenu>
			</TldrawEditorUi>
		</TldrawEditor>
	)
}
