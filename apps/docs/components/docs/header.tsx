import { Article } from '@/types/content-types'

export const Header: React.FC<{ article: Article }> = ({ article }) => {
	return (
		<section className="pb-12 mb-12 border-b border-zinc-100">
			<h1 className="font-black text-black text-4xl">{article.title}</h1>
		</section>
	)
}
