'use server'

import { format } from 'date-fns'
import { JWT } from 'google-auth-library'
import queryString from 'query-string'

const spreadsheetId = '1r90XEsR-qAAvHelPDqg1codep11ErDpJIgeiL-eSv9M'
const range = 'A:L'
const endpoint = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append`

const client = new JWT({
	email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
	key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY!.replace(/\\n/g, '\n'),
	scopes: ['https://www.googleapis.com/auth/spreadsheets'],
})

export async function submitLicenseForm(prevState: any, formData: FormData) {
	try {
		const data = [
			format(new Date(), 'dd/MM/yyyy HH:mm:ss'), // A: Timestamp
			formData.get('email'), // B: Email address
			formData.get('name'), // C: What is your name?
			formData.get('company'), // D: What is your company name?
			formData.get('role'), // E: What is your role at the company?
			formData.get('size'), // F: How many people work for your company?
			formData.get('usage'), // G: How do you plan to use tldraw?
			formData.get('type'), // H: What kind of project is this for?
			formData.get('location'), // I: Where are you located?
		]
		const query = queryString.stringify({
			valueInputOption: 'USER_ENTERED',
			insertDataOption: 'INSERT_ROWS',
			includeValuesInResponse: false,
			responseValueRenderOption: 'FORMATTED_VALUE',
			responseDateTimeRenderOption: 'FORMATTED_STRING',
		})
		const body = {
			range: 'A:L',
			majorDimension: 'ROWS',
			values: [data],
		}
		const response = await client.request({
			url: `${endpoint}?${query}`,
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		})
		// console.log(response)
		if (response.status !== 200) throw response.statusText
		return { success: true }
	} catch (error) {
		return { error: String(error), success: false }
	}
}
