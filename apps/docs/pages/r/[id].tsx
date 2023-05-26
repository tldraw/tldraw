import { useRouter } from 'next/router'

export default function RedirectToSubstack() {
	const router = useRouter()
	const id = router.query.id as string

	if (typeof window !== 'undefined') {
		window.location.href = `https://tldraw.substack.com/p/${id}`
	}
	return <div>Redirecting...</div>
}
