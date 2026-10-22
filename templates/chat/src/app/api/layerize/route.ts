import { createFalClient } from '@fal-ai/client'
import { z } from 'zod'
import { layerizeResultSchema } from '../../../utils/layerizeSchema'

const endpoint = 'bytedance/seedream/v5/pro/layerize'
const inputSchema = z.object({
	image_url: z
		.string()
		.max(42_000_000)
		.regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/),
})
const requestIdSchema = z.string().regex(/^[a-zA-Z0-9-]{1,128}$/)

export async function POST(request: Request) {
	if (!process.env.FAL_KEY) return missingKey()
	const input = inputSchema.safeParse(await request.json().catch(() => null))
	if (!input.success)
		return Response.json(
			{ error: 'Provide a PNG, JPEG, or WebP image under 30 MB.' },
			{ status: 400 }
		)
	try {
		const fal = createFalClient({ credentials: process.env.FAL_KEY })
		const result = await fal.queue.submit(endpoint, { input: input.data })
		return Response.json({ requestId: result.request_id })
	} catch {
		return failure()
	}
}

export async function GET(request: Request) {
	if (!process.env.FAL_KEY) return missingKey()
	const id = requestIdSchema.safeParse(new URL(request.url).searchParams.get('requestId'))
	if (!id.success) return Response.json({ error: 'Invalid request ID.' }, { status: 400 })
	try {
		const fal = createFalClient({ credentials: process.env.FAL_KEY })
		const status = await fal.queue.status(endpoint, { requestId: id.data })
		if (status.status !== 'COMPLETED') return Response.json({ status: status.status })
		const result = await fal.queue.result(endpoint, { requestId: id.data })
		return Response.json({ status: 'COMPLETED', ...layerizeResultSchema.parse(result.data) })
	} catch {
		return failure()
	}
}

function missingKey() {
	return Response.json({ error: 'Set FAL_KEY on the server to use Layerize.' }, { status: 503 })
}
function failure() {
	return Response.json(
		{ error: 'FAL could not layerize this image. Please try again.' },
		{ status: 502 }
	)
}
