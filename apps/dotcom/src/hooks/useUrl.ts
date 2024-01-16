import { useLocation } from 'react-router-dom'

export function useUrl() {
	const location = useLocation()
	const url = `https://www.tldraw.com${location.pathname}`
	return url
}
