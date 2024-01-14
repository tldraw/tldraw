import { Category, Section } from '@/types/content-types'
import Link from 'next/link'

export function Breadcrumb({ section, category }: { section?: Section; category?: Category }) {
	return (
		<div className="breadcrumb">
			{section && (
				<>
					{section.title && section.id === 'getting-started' ? (
						section.title
					) : (
						<Link href={`/${section.id}`}>{section.title}</Link>
					)}
					{category && (
						<>
							{category.id === section.id + '_ucg' ? null : (
								<>
									{` / `}
									<Link href={`/${section.id}/${category.id}`}>{category.title}</Link>
								</>
							)}
						</>
					)}
				</>
			)}
		</div>
	)
}
