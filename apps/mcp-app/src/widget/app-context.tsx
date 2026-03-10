import { type App, type McpUiDisplayMode } from '@modelcontextprotocol/ext-apps/react'
import { createContext } from 'react'
import type { MCP_APP_HOST_NAMES } from '../shared/types'

export const McpAppContext = createContext<{
	displayMode: McpUiDisplayMode
	toggleFullscreen: (() => Promise<void>) | null
	canFullscreen: boolean
	canDownload: boolean
	app: App | null
	lastEditor: 'user' | 'ai'
	hostName: MCP_APP_HOST_NAMES | null
	isDev: boolean
	isDevLogVisible: boolean
	toggleDevLog: (() => void) | null
	appendDevLog: ((message: string) => void) | null
}>({
	displayMode: 'inline',
	toggleFullscreen: null,
	canFullscreen: true,
	canDownload: true,
	app: null,
	lastEditor: 'ai',
	hostName: null,
	isDev: false,
	isDevLogVisible: false,
	toggleDevLog: null,
	appendDevLog: null,
})
