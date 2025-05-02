import { DocsMobileSidebar } from '@/components/docs/docs-mobile-sidebar'
import { DocsSidebar } from '@/components/docs/docs-sidebar'
import { FullPageSearch } from '@/components/search/FullPageSearch'

export const dynamic = 'force-dynamic'

export default function Page() {
	return (
		<div className="w-full max-w-screen-xl mx-auto md:px-5 md:flex md:pt-8 isolate md:isolation-auto">
			<DocsSidebar />
			<div className="sticky top-14 z-10 flex items-center justify-between w-full h-12 px-5 bg-white border-b border-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 backdrop-blur md:hidden">
				<DocsMobileSidebar />
			</div>
			<main className="relative w-full max-w-3xl px-5 pt-7 shrink md:pr-0 lg:pl-12 xl:pr-12 md:pt-0 min-w-[1px]">
				<FullPageSearch indexName="docs" />
			</main>
		</div>
	)
}
