import { Card } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { formatDate } from '@/lib/utils'
import { urlFor } from '@/sanity/image'
import { getEvents } from '@/sanity/queries'
import type { Metadata } from 'next'
import Image from 'next/image'

export const metadata: Metadata = {
	title: 'Events',
	description: 'Upcoming and past tldraw events, meetups, and conferences.',
}

export default async function EventsPage() {
	const events = await getEvents()
	const upcoming = events?.filter((e) => e.isUpcoming) || []
	const past = events?.filter((e) => !e.isUpcoming) || []

	return (
		<>
			<PageHeader
				title="Events"
				description="Upcoming and past tldraw events, meetups, and conferences."
			/>
			<div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-24 lg:px-8">
				{upcoming.length > 0 && (
					<div className="mb-16">
						<h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">Upcoming</h2>
						<div className="space-y-6">
							{upcoming.map((event) => (
								<EventCard key={event._id} event={event} />
							))}
						</div>
					</div>
				)}
				{past.length > 0 && (
					<div>
						<h2 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-white">Past</h2>
						<div className="space-y-6">
							{past.map((event) => (
								<EventCard key={event._id} event={event} />
							))}
						</div>
					</div>
				)}
				{!events?.length && (
					<p className="text-center text-zinc-500 dark:text-zinc-400">
						No events scheduled. Check back soon.
					</p>
				)}
			</div>
		</>
	)
}

function EventCard({
	event,
}: {
	event: NonNullable<Awaited<ReturnType<typeof getEvents>>>[number]
}) {
	const content = (
		<Card className="flex gap-6">
			{event.coverImage && (
				<Image
					src={urlFor(event.coverImage).width(120).height(120).url()}
					alt={event.title}
					width={120}
					height={120}
					className="hidden rounded-lg object-cover sm:block"
				/>
			)}
			<div>
				<h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{event.title}</h3>
				<p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
					{formatDate(event.date)} &middot; {event.location}
				</p>
				{event.description && (
					<p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{event.description}</p>
				)}
			</div>
		</Card>
	)

	if (event.url) {
		return (
			<a
				href={event.url}
				target="_blank"
				rel="noopener noreferrer"
				className="block transition-opacity hover:opacity-80"
			>
				{content}
			</a>
		)
	}

	return content
}
