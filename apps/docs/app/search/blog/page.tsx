import { BlogMobileSidebar } from '@/components/blog/blog-mobile-sidebar'
import { BlogSidebar } from '@/components/blog/blog-sidebar'
import { FullPageSearch } from '@/components/search/FullPageSearch'

export const dynamic = 'force-dynamic'

// TODO: Merge this index with the /search page
// See https://linear.app/tldraw/issue/INT-1158/merge-search-indices
export default function Page() {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-8 isolate md:isolation-auto">
			<BlogSidebar />
			<div className="sticky top-14 z-10 flex items-center justify-between w-full h-12 px-5 bg-white border-b border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 backdrop-blur md:hidden">
				<BlogMobileSidebar />
			</div>
			<main className="relative w-full max-w-3xl px-5 pt-7 shrink md:pr-0 lg:pl-12 xl:pr-12 md:pt-0 min-w-[1px]">
				<FullPageSearch indexName="blog" />
			</main>
		</div>
	)
}
