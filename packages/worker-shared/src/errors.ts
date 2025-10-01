export function notFound() {
	return Response.json({ error: 'Not found' }, { status: 404 })
}

export function forbidden() {
	return Response.json({ error: 'Forbidden' }, { status: 403 })
}
