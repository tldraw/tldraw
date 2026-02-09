import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { type NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
	const secret = req.nextUrl.searchParams.get('secret')
	const slug = req.nextUrl.searchParams.get('slug') || '/'

	if (secret !== process.env.SANITY_PREVIEW_SECRET) {
		return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
	}

	const draft = await draftMode()
	draft.enable()
	redirect(slug)
}
