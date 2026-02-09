import { revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
	const secret = req.nextUrl.searchParams.get('secret')

	if (secret !== process.env.SANITY_REVALIDATE_SECRET) {
		return NextResponse.json({ message: 'Invalid secret' }, { status: 401 })
	}

	try {
		const body = await req.json()
		const { _type } = body

		if (!_type) {
			return NextResponse.json({ message: 'Missing document type' }, { status: 400 })
		}

		// Revalidate based on document type
		revalidateTag(_type, 'default')

		return NextResponse.json({
			revalidated: true,
			now: Date.now(),
			type: _type,
		})
	} catch (err) {
		return NextResponse.json({ message: 'Error revalidating' }, { status: 500 })
	}
}
