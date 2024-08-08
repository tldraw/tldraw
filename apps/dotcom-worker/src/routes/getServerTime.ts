import { GetServerTimeResponseBody } from '@tldraw/dotcom-shared'

export async function getServerTime(): Promise<Response> {
	return new Response(
		JSON.stringify({ serverTime: Date.now() } satisfies GetServerTimeResponseBody)
	)
}
