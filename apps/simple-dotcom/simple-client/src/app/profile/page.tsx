import { User } from '@/lib/api/types'
import { auth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

async function getUserProfile(userId: string): Promise<User | null> {
	const supabase = await createClient()

	const { data: profile } = await supabase
		.from('users')
		.select('id, email, display_name, name, created_at, updated_at')
		.eq('id', userId)
		.single()

	return profile
}

export default async function ProfilePage() {
	// Server-side auth check
	const session = await auth.api.getSession({
		headers: await headers(),
	})

	// Redirect to login if not authenticated
	if (!session?.user) {
		redirect('/login')
	}

	// Fetch profile data server-side
	const profile = await getUserProfile(session.user.id)

	return <ProfileClient profile={profile} />
}
