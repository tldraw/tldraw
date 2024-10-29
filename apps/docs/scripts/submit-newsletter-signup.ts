'use server'

export async function submitNewsletterSignup(email: string) {
	const res = await fetch('https://api.sendgrid.com/v3/marketing/contacts', {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			list_ids: [process.env.SENDGRID_LIST_ID],
			contacts: [
				{
					email,
				},
			],
		}),
	})
	if (res.status !== 202) return { error: true }
	return { error: false }
}
