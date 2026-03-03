/** Entry point: start the MCP server with stdio transport. */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createServer } from './server'

async function main() {
	const server = createServer()
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('tldraw MCP server running on stdio')
}

main().catch((err) => {
	console.error('Failed to start stdio server:', err)
	process.exit(1)
})
