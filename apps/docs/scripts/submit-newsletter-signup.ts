'use server'

export async function submitNewsletterSignup(email: string, cookie: string | undefined) {
	const res = await fetch(
		'https://api.hsforms.com/submissions/v3/integration/secure/submit/145620695/ff47937e-8c83-4f26-b00a-1ea4ae11a7c4',
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.HUBSPOT_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				submittedAt: Date.now(),
				fields: [
					{
						name: 'email',
						value: email,
					},
				],
				context: {
					hutk: cookie,
					pageUri: 'https://tldraw.dev/',
					pageName: 'tldraw dev',
				},
			}),
		}
	)
	if (res.status !== 200) {
		return { error: true }
	}
	return { error: false }
}
