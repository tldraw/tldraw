import { Breadcrumb } from '@/components/Breadcrumb'
import { MetaHead } from '@/components/MetaHead'
import { Sidebar } from '@/components/Sidebar'
import { SidebarContentList } from '@/types/content-types'
import { SearchResult } from '@/types/search-types'
import { getSidebarContentList } from '@/utils/getSidebarContentList'
import { GetServerSideProps } from 'next'
import { useTheme } from 'next-themes'
import Link from 'next/link'

type Props = {
	sidebar: SidebarContentList
	results: SearchResult[]
	query: string
}

export default function SectionListPage({ sidebar, query, results }: Props) {
	const theme = useTheme()

	return (
		<>
			<MetaHead title={`Search Results: ${query} (${results.length})`} />
			<div className="layout">
				<Sidebar {...sidebar} />
				<main className={`article list ${theme.theme ?? 'light'}`}>
					<Breadcrumb />
					<h1>{`Found ${results.length} Results for "${query}"`}</h1>
					<ul>
						{results.map((result) => (
							<Link key={result.id} href={`${result.url}`}>
								<li>
									<h4>{result.subtitle}</h4>
									<h3>{result.title}</h3>
								</li>
							</Link>
						))}
					</ul>
				</main>
			</div>
		</>
	)
}

export const getServerSideProps: GetServerSideProps<Props> = async (ctx) => {
	// get the q out of search-results?q=foo
	const query = ctx.query?.q?.toString() as string
	if (!query) throw Error()

	const sidebar = await getSidebarContentList({})

	// fetch from our current server
	const res = await fetch(`http://${ctx.req.headers.host}/api/search?q=${query}`)

	const json = await res.json()
	const results = json.results

	return { props: { sidebar, query, results } }
}
