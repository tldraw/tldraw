import { type App } from '@modelcontextprotocol/ext-apps/react'
import { createContext } from 'react'
import type { MCP_APP_HOST_NAMES } from '../shared/types'

export const McpAppContext = createContext<{
	displayMode: 'inline' | 'fullscreen'
	toggleFullscreen: (() => void) | null
	canFullscreen: boolean
	canDownload: boolean
	app: App | null
	lastEditor: 'user' | 'ai'
	hostName: MCP_APP_HOST_NAMES | null
}>({
	displayMode: 'inline',
	toggleFullscreen: null,
	canFullscreen: true,
	canDownload: true,
	app: null,
	lastEditor: 'ai',
	hostName: null,
})
