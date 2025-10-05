import { User } from '@/lib/api/types'
import { createClient, getCurrentUser } from '@/lib/supabase/server'
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
	const user = await getCurrentUser()

	// Redirect to login if not authenticated
	if (!user) {
		redirect('/login')
	}

	// Fetch profile data server-side
	const profile = await getUserProfile(user.id)

	return <ProfileClient profile={profile} />
}
