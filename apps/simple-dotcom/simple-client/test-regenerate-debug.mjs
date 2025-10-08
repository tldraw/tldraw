// Test regenerate API with detailed debugging
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const BASE_URL = 'http://localhost:3000';

async function testRegenerateWithDebug() {
  console.log('Testing regenerate API...\n');

  // Test user credentials
  const testEmail = `test-regenerate-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log('1. Creating test user...');

  // Sign up
  const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword,
      name: 'Test User'
    })
  });

  if (!signupResponse.ok) {
    const errorText = await signupResponse.text();
    console.error('Signup failed:', signupResponse.status, errorText);
    return;
  }

  const signupData = await signupResponse.json();
  console.log('User created:', signupData.data.id);

  // Get session cookie
  const setCookie = signupResponse.headers.get('set-cookie');
  const cookies = setCookie ? setCookie.split(';')[0] : '';

  console.log('2. Creating workspace with invitation...');

  // Create workspace
  const createWorkspaceResponse = await fetch(`${BASE_URL}/api/workspaces`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies
    },
    body: JSON.stringify({
      name: 'Test Workspace',
      description: 'Testing regenerate',
      is_private: false,
      enable_invite: true
    })
  });

  if (!createWorkspaceResponse.ok) {
    const errorText = await createWorkspaceResponse.text();
    console.error('Create workspace failed:', createWorkspaceResponse.status, errorText);
    return;
  }

  const workspaceData = await createWorkspaceResponse.json();
  const workspaceId = workspaceData.data.id;
  const originalToken = workspaceData.data.inviteToken;

  console.log('3. Workspace created:', {
    id: workspaceId,
    inviteToken: originalToken
  });

  // Wait a bit to ensure DB consistency
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('\n4. Attempting to regenerate invitation...');

  // Regenerate invitation
  const regenerateResponse = await fetch(`${BASE_URL}/api/workspaces/${workspaceId}/invite/regenerate`, {
    method: 'POST',
    headers: {
      'Cookie': cookies
    }
  });

  const responseText = await regenerateResponse.text();

  if (!regenerateResponse.ok) {
    console.error('\n❌ REGENERATE FAILED:');
    console.error('Status:', regenerateResponse.status);
    console.error('Response body:', responseText);

    // Try to parse as JSON
    try {
      const errorData = JSON.parse(responseText);
      console.error('\nParsed error:', JSON.stringify(errorData, null, 2));
    } catch (e) {
      // Not JSON
    }

    // Check if we can still query the database directly
    console.log('\n5. Checking database state...');

    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: inviteLinks, error: queryError } = await supabase
      .from('invitation_links')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (queryError) {
      console.error('Failed to query invitation_links:', queryError);
    } else {
      console.log('Current invitation links for workspace:', inviteLinks);
    }

    return;
  }

  const regenerateData = JSON.parse(responseText);
  console.log('✅ Regenerate successful:', regenerateData);
}

testRegenerateWithDebug().catch(console.error);