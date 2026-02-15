import Link from 'next/link'

interface Category {
	_id: string
	title: string
	slug: { current: string }
}

interface CategoryNavProps {
	categories: Category[]
	activeCategory?: string
}

const activeClasses =
	'rounded-full bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-zinc-900'
const inactiveClasses =
	'rounded-full border border-zinc-200 px-4 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-white'

export function CategoryNav({ categories, activeCategory }: CategoryNavProps) {
	return (
		<nav className="mb-8 flex flex-wrap gap-2">
			<Link href="/blog" className={!activeCategory ? activeClasses : inactiveClasses}>
				All
			</Link>
			{categories.map((cat) => (
				<Link
					key={cat._id}
					href={`/blog/category/${cat.slug.current}`}
					className={cat.slug.current === activeCategory ? activeClasses : inactiveClasses}
				>
					{cat.title}
				</Link>
			))}
		</nav>
	)
}
