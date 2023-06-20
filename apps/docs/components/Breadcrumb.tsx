import { Article, Category, Section } from '@/types/content-types'
import Link from 'next/link'

export function Breadcrumb({
	section,
	category,
	article,
}: {
	section?: Section
	category?: Category
	article?: Article
}) {
	return (
		<div className="breadcrumb">
			<Link href={`/`}>tldraw</Link>
			{section && (
				<>
					{section.title && (
						<>
							{` / `}
							<Link href={`/${section.id}`}>{section.title}</Link>
						</>
					)}
					{category && (
						<>
							{category.id === 'ucg' ? null : (
								<>
									{` / `}
									<Link href={`/${section.id}/${category.id}`}>{category.title}</Link>
								</>
							)}
							{article && (
								<>
									{` / `}
									<Link href={`/${section.id}/${category.id}/${article.id}`}>{article.title}</Link>
								</>
							)}
						</>
					)}
				</>
			)}
		</div>
	)
}
