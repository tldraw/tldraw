import Image from 'next/image'

export interface TeamGridMember {
	id: string
	name: string
	role: string
	bio?: string
	avatar?: string
}

interface TeamGridProps {
	members: TeamGridMember[]
}

export function TeamGrid({ members }: TeamGridProps) {
	return (
		<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{members.map((member) => (
				<div key={member.id} className="text-center">
					{member.avatar && (
						<Image
							src={member.avatar}
							alt={member.name}
							width={200}
							height={200}
							className="mx-auto rounded-full"
						/>
					)}
					<h3 className="mt-4 text-base font-semibold text-black dark:text-white">{member.name}</h3>
					<p className="text-sm text-zinc-500 dark:text-zinc-400">{member.role}</p>
					{member.bio && <p className="text-body mt-2 text-sm dark:text-zinc-400">{member.bio}</p>}
				</div>
			))}
		</div>
	)
}
