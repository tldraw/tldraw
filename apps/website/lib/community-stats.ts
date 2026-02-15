import { communityContent } from '@/content/homepage'

export interface CommunityStat {
	value: string
	label: string
	linkText: string
	url: string
	chartData?: number[]
}

const REVALIDATE = 86400 // 24 hours

function formatNumber(n: number): string {
	if (n >= 1_000_000) {
		const m = n / 1_000_000
		return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`
	}
	if (n >= 1_000) {
		const k = n / 1_000
		return k >= 100 ? `${Math.round(k)}K` : k >= 10 ? `${k.toFixed(1)}K` : `${k.toFixed(2)}K`
	}
	return String(n)
}

const fallbackStats = communityContent.stats

async function fetchGitHubStars(): Promise<string> {
	const res = await fetch('https://api.github.com/repos/tldraw/tldraw', {
		headers: { Accept: 'application/vnd.github.v3+json' },
		next: { revalidate: REVALIDATE },
	})
	if (!res.ok) throw new Error(`GitHub API ${res.status}`)
	const data = await res.json()
	return formatNumber(data.stargazers_count)
}

async function fetchNpmDownloads(): Promise<string> {
	const res = await fetch('https://api.npmjs.org/downloads/point/last-week/tldraw', {
		next: { revalidate: REVALIDATE },
	})
	if (!res.ok) throw new Error(`npm API ${res.status}`)
	const data = await res.json()
	return formatNumber(data.downloads)
}

async function fetchNpmDownloadRange(): Promise<number[]> {
	const res = await fetch('https://api.npmjs.org/downloads/range/last-month/tldraw', {
		next: { revalidate: REVALIDATE },
	})
	if (!res.ok) throw new Error(`npm range API ${res.status}`)
	const data = await res.json()
	return (data.downloads as { downloads: number; day: string }[]).map((d) => d.downloads)
}

export async function getCommunityStats(): Promise<CommunityStat[]> {
	const [githubStars, npmDownloads, npmRange] = await Promise.allSettled([
		fetchGitHubStars(),
		fetchNpmDownloads(),
		fetchNpmDownloadRange(),
	])

	return fallbackStats.map((stat) => {
		if (stat.linkText === 'GitHub' && githubStars.status === 'fulfilled') {
			return { ...stat, value: githubStars.value }
		}
		if (stat.linkText === 'npm' && npmDownloads.status === 'fulfilled') {
			return {
				...stat,
				value: npmDownloads.value,
				chartData: npmRange.status === 'fulfilled' ? npmRange.value : undefined,
			}
		}
		return stat
	})
}
