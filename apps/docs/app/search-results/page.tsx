import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { SearchResult } from '@/types/search-types'
import { getDb } from '@/utils/ContentDatabase'
import Link from 'next/link'
import process from 'process'

const HOST_URL =
	process.env.NODE_ENV === 'development'
		? 'http://localhost:3001'
		: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.tldraw.dev'

export default async function SearchResultsPage({
	searchParams,
}: {
	searchParams: { q: string; t: string }
}) {
	const query = searchParams.q?.toString() as string
	const type = searchParams.t?.toString() as string

	const db = await getDb()
	const sidebar = await db.getSidebarContentList({})

	let results: {
		articles: SearchResult[]
		apiDocs: SearchResult[]
		error: null | string
	} = {
		articles: [],
		apiDocs: [],
		error: null,
	}

	if (query) {
		const endPoint =
			type === 'ai' ? `${HOST_URL}/api/ai?q=${query}` : `${HOST_URL}/api/search?q=${query}`
		const res = await fetch(endPoint)
		if (!res.ok) {
			results.error = await res.text()
		} else {
			const json = await res.json()
			results = json.results
		}
	}

	return (
		<>
			<Header searchQuery={query} searchType={type} />
			<Sidebar {...sidebar} searchQuery={query} searchType={type} />
			<main className="article list">
				<div className="page-header">
					<h2>{`Found ${
						results.articles.length + results.apiDocs.length
					} results for "${query}"`}</h2>
					<div className="search__results__switcher">
						{type === 'ai' ? (
							<Link href={`/search-results?q=${query}&t=n`}>Search again using exact match...</Link>
						) : (
							// TODO: replace emoji with icon
							<Link href={`/search-results?q=${query}&t=ai`}>✨ Search again using AI...</Link>
						)}
					</div>
				</div>
				<ResultsList results={results.articles} type={type} />
				{results.articles.length > 0 && results.apiDocs.length > 0 && (
					<>
						<hr />
						<h2>API Docs</h2>
					</>
				)}
				{results.apiDocs.length > 0 && <ResultsList results={results.apiDocs} type={type} />}
			</main>
		</>
	)
}

function ResultsList({ results, type }: { results: SearchResult[]; type?: string }) {
	return (
		<ul className="search__results__list">
			{results.map((result) => (
				<Link className="search__results__link" key={result.id} href={`${result.url}`}>
					<li className="search__results__article">
						<div className="search__results__article__details">
							<h4>{result.subtitle}</h4>
							{type === 'ai' && (
								<span className="search__results__article__score">
									{(result.score * 100).toFixed()}%
								</span>
							)}
						</div>
						<h3>{result.title}</h3>
					</li>
				</Link>
			))}
		</ul>
	)
}
