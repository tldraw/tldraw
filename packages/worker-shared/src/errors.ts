export function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}
