import { Card } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'
import Image from 'next/image'
import Link from 'next/link'

export interface BlogCardPost {
	id: string
	slug: string
	title: string
	excerpt: string
	coverImage?: string
	date: string
	category?: { title: string; slug: string }
	author?: { name: string; avatar?: string }
}

interface BlogCardProps {
	post: BlogCardPost
}

export function BlogCard({ post }: BlogCardProps) {
	return (
		<Link href={`/blog/${post.slug}`} className="group">
			<Card hover className="overflow-hidden p-0">
				{post.coverImage && (
					<div className="aspect-video overflow-hidden">
						<Image
							src={post.coverImage}
							alt={post.title}
							width={640}
							height={360}
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>
					</div>
				)}
				<div className="p-6">
					{post.category && (
						<span className="text-xs font-medium tracking-wider text-zinc-500 uppercase dark:text-zinc-400">
							{post.category.title}
						</span>
					)}
					<h3 className="mt-2 text-lg font-semibold text-black dark:text-white">{post.title}</h3>
					<p className="text-body mt-2 line-clamp-2 text-sm dark:text-zinc-400">{post.excerpt}</p>
					<div className="mt-4 flex items-center gap-3">
						{post.author?.avatar && (
							<Image
								src={post.author.avatar}
								alt={post.author.name}
								width={32}
								height={32}
								className="rounded-full"
							/>
						)}
						<div className="text-sm">
							<p className="font-medium text-black dark:text-white">{post.author?.name}</p>
							<p className="text-zinc-500 dark:text-zinc-400">{formatDate(post.date)}</p>
						</div>
					</div>
				</div>
			</Card>
		</Link>
	)
}
