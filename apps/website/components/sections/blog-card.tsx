import { formatDate, stripHtml } from '@/lib/utils'
import { urlFor } from '@/sanity/image'
import type { BlogPost } from '@/sanity/types'
import Image from 'next/image'
import Link from 'next/link'

interface BlogCardProps {
	post: BlogPost
}

export function BlogCard({ post }: BlogCardProps) {
	return (
		<Link href={`/blog/${post.slug.current}`} className="group">
			<article className="overflow-hidden rounded-xl border border-zinc-200 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700">
				{post.coverImage && (
					<div className="aspect-video overflow-hidden">
						<Image
							src={urlFor(post.coverImage).width(640).height(360).url()}
							alt={post.coverImage.alt || post.title}
							width={640}
							height={360}
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>
					</div>
				)}
				<div className="p-6">
					{post.category && (
						<span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
							{post.category.title}
						</span>
					)}
					<h3 className="mt-2 text-lg font-semibold text-black dark:text-white">{post.title}</h3>
					<p className="mt-2 line-clamp-2 text-sm text-body dark:text-zinc-400">
						{stripHtml(post.excerpt)}
					</p>
					<div className="mt-4 flex items-center gap-3">
						{post.author?.avatar && (
							<Image
								src={urlFor(post.author.avatar).width(32).height(32).url()}
								alt={post.author.name}
								width={32}
								height={32}
								className="rounded-full"
							/>
						)}
						<div className="text-sm">
							<p className="font-medium text-black dark:text-white">{post.author?.name}</p>
							<p className="text-zinc-500 dark:text-zinc-400">{formatDate(post.publishedAt)}</p>
						</div>
					</div>
				</div>
			</article>
		</Link>
	)
}
