// Test script to manually test the regenerate invitation API
const fetch = require('node-fetch')

async function testRegenerateFlow() {
	const BASE_URL = 'http://localhost:3000'

	// Test user credentials
	const testEmail = `test-regenerate-${Date.now()}@example.com`
	const testPassword = 'TestPassword123!'

	console.log('1. Creating test user...')

	// Sign up
	const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: testEmail,
			password: testPassword,
			name: 'Test User',
		}),
	})

	if (!signupResponse.ok) {
		console.error('Signup failed:', await signupResponse.text())
		return
	}

	// Get session cookie
	const setCookie = signupResponse.headers.get('set-cookie')
	const cookies = setCookie ? setCookie.split(';')[0] : ''

	console.log('2. Creating workspace with invitation...')

	// Create workspace
	const createWorkspaceResponse = await fetch(`${BASE_URL}/api/workspaces`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Cookie: cookies,
		},
		body: JSON.stringify({
			name: 'Test Workspace',
			description: 'Testing regenerate',
			is_private: false,
			enable_invite: true,
		}),
	})

	if (!createWorkspaceResponse.ok) {
		console.error('Create workspace failed:', await createWorkspaceResponse.text())
		return
	}

	const workspaceData = await createWorkspaceResponse.json()
	const workspaceId = workspaceData.data.id
	const originalToken = workspaceData.data.inviteToken

	console.log('3. Workspace created:', {
		id: workspaceId,
		inviteToken: originalToken,
	})

	console.log('4. Attempting to regenerate invitation...')

	// Regenerate invitation
	const regenerateResponse = await fetch(
		`${BASE_URL}/api/workspaces/${workspaceId}/invite/regenerate`,
		{
			method: 'POST',
			headers: {
				Cookie: cookies,
			},
		}
	)

	if (!regenerateResponse.ok) {
		const errorText = await regenerateResponse.text()
		console.error('❌ REGENERATE FAILED:')
		console.error('Status:', regenerateResponse.status)
		console.error('Response:', errorText)

		// Try to parse error if it's JSON
		try {
			const errorData = JSON.parse(errorText)
			console.error('Parsed error:', JSON.stringify(errorData, null, 2))
		} catch (e) {
			// Not JSON
		}
		return
	}

	const regenerateData = await regenerateResponse.json()
	console.log('✅ Regenerate successful:', regenerateData)

	// Test the old token
	console.log('5. Testing old token validation...')
	const validateOldResponse = await fetch(`${BASE_URL}/api/invite/${originalToken}/validate`)

	if (validateOldResponse.ok) {
		const oldTokenData = await validateOldResponse.json()
		console.error('❌ Old token still validates (should fail):', oldTokenData)
	} else {
		const errorText = await validateOldResponse.text()
		console.log('✅ Old token validation failed as expected:', errorText)
	}

	// Test the new token
	const newToken = regenerateData.data.token
	console.log('6. Testing new token validation...')
	const validateNewResponse = await fetch(`${BASE_URL}/api/invite/${newToken}/validate`)

	if (validateNewResponse.ok) {
		const newTokenData = await validateNewResponse.json()
		console.log('✅ New token validates:', newTokenData)
	} else {
		const errorText = await validateNewResponse.text()
		console.error('❌ New token validation failed:', errorText)
	}
}

testRegenerateFlow().catch(console.error)
