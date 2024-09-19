'use server'

export async function requestLicense(prevState: any, formData: FormData) {
	const formUrl =
		'https://docs.google.com/forms/d/e/1FAIpQLSekGIGnCiN03-ufIDZe96EZoX3O1utFouxn_5nVpUKJep4E0g'
	const fields = [
		{ id: 'entry.1686260022', value: formData.get('email') },
		{ id: 'entry.988329599', value: formData.get('name') },
		{ id: 'entry.41006083', value: formData.get('location') },
		{ id: 'entry.1067984933', value: formData.get('company') },
		{ id: 'entry.1401673005', value: formData.get('role') },
		{ id: 'entry.951403783', value: formData.get('size') },
		{ id: 'entry.1736066258', value: formData.get('usage') },
		{ id: 'entry.286280557', value: formData.get('type') },
	]
	const submitUrl = `${formUrl}/formResponse?${fields.map(({ id, value }) => (value !== '' ? `${id}=${String(value).replaceAll('@', '%40')}&` : '')).join('')}`
	const response = await fetch(submitUrl, { method: 'GET' })
	if (response.status === 200) return { success: true }
	return { error: 'Something went wrong...', success: false }
}
