import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { server } from './server.js'

async function main() {
	const transport = new StdioServerTransport()
	await server.connect(transport)
	console.error('tldraw MCP server running on stdio')
}

main().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
