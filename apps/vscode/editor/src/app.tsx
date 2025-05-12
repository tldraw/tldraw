import { getAssetUrlsByImport } from '@tldraw/assets/imports'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	DefaultMainMenu,
	DefaultSpinner,
	EditSubmenu,
	Editor,
	ErrorBoundary,
	ExportFileContentSubMenu,
	ExtrasGroup,
	PreferencesGroup,
	TLComponents,
	Tldraw,
	ViewSubmenu,
	setRuntimeOverrides,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { VscodeMessage } from '../../messages'
import '../public/index.css'
import { ChangeResponder } from './ChangeResponder'
import { FileOpen } from './FileOpen'
import { FullPageMessage } from './FullPageMessage'
import { Links } from './Links'
import { onCreateAssetFromUrl } from './utils/bookmarks'
import { registerExternalUrlContentHandler } from './utils/externalUrlContentHandler'
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

export function TldrawWrapper() {
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
		<FullPageMessage>
			<DefaultSpinner />
		</FullPageMessage>
	) : (
		<TldrawInner {...tldrawInnerProps} />
	)
}

export interface TLDrawInnerProps {
	assetSrc: string
	fileContents: string
	uri: string
	isDarkMode: boolean
}

const components: TLComponents = {
	MainMenu: () => (
		<DefaultMainMenu>
			<EditSubmenu />
			<ViewSubmenu />
			<ExportFileContentSubMenu />
			<ExtrasGroup />
			<PreferencesGroup />
			<Links />
		</DefaultMainMenu>
	),
}
function TldrawInner({ uri, assetSrc, isDarkMode, fileContents }: TLDrawInnerProps) {
	const assetUrls = useMemo(() => getAssetUrlsByImport({ baseUrl: assetSrc }), [assetSrc])

	const handleMount = useCallback((editor: Editor) => {
		editor.registerExternalAssetHandler('url', onCreateAssetFromUrl)
		registerExternalUrlContentHandler(editor)
	}, [])

	const licenseKey =
		'tldraw-tldraw-2026-04-22/WyJyWWVGS2JHZSIsWyJ0bGRyYXctb3JnLnRsZHJhdy12c2NvZGUiXSw5LCIyMDI2LTA0LTIyIl0.2FrnO8fHmSUJI+vU2t2YFDdUL5mx+Lyk9NqaCVeZJG1FasJ6tfIv08m9tctEGzQG9BVVHT8g8/Wv/JJT5ueLAA'
	return (
		<Tldraw
			assetUrls={assetUrls}
			persistenceKey={uri}
			onMount={handleMount}
			components={components}
			licenseKey={licenseKey}
		>
			{/* <DarkModeHandler themeKind={themeKind} /> */}

			<FileOpen fileContents={fileContents} forceDarkMode={isDarkMode} />
			<ChangeResponder />
		</Tldraw>
	)
}
