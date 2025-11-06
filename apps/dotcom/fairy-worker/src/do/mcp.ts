import { experimental_createMCPClient } from '@ai-sdk/mcp'

export async function createNotionMCPClient() {
	let notionClient: Awaited<ReturnType<typeof experimental_createMCPClient>> | undefined
	try {
		console.warn('mcp.ts createNotionMCPClient')
		notionClient = await experimental_createMCPClient({
			transport: {
				type: 'http',
				// url: 'https://mcp.notion.com/mcp',
				url: 'https://mcp.pipedream.net/v2',

				// optional: configure headers
				//   headers: { Authorization: 'Bearer my-api-key' },

				// optional: provide an OAuth client provider for automatic authorization
				// authProvider: myOAuthClientProvider,
			},
		})

		// const toolSetNotion = await notionClient.tools();

		// return { client: notionClient, tools: toolSetNotion };
	} catch (error) {
		console.error('Error creating MCP client:', error)
		throw error
	} finally {
		if (notionClient) {
			await notionClient.close()
		}
	}
}
