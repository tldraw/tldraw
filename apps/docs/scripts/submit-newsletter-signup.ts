'use server'

export async function submitNewsletterSignup(email: string, hutk: string | undefined, url: string) {
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
					hutk,
					pageUri: url,
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
