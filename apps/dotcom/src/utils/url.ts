export function openUrl(url: string) {
	window.open(url, '_blank')
}

/**
 * Compares two URLs to see if they are the same. This ignores encoding.
 * @param first - The first URL to compare.
 * @param second - The second URL to compare.
 * @returns Whether the URLs are the same.
 */
export function sameUrls(first: string, second: string): boolean {
	const firstUrl = new URL(first)
	const secondUrl = new URL(second)
	const firstPathname = decodeURIComponent(firstUrl.pathname)
	const secondPathname = decodeURIComponent(secondUrl.pathname)
	const firstSearch = decodeURIComponent(firstUrl.search)
	const secondSearch = decodeURIComponent(secondUrl.search)
	const firstHash = decodeURIComponent(firstUrl.hash)
	const secondHash = decodeURIComponent(secondUrl.hash)
	return (
		firstUrl.origin === secondUrl.origin &&
		firstPathname === secondPathname &&
		firstSearch === secondSearch &&
		firstHash === secondHash
	)
}
