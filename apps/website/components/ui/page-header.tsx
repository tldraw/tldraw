import { Section } from './section'
import { SectionHeading } from './section-heading'

interface PageHeaderProps {
	title: string
	description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
	return (
		<Section>
			<SectionHeading title={title} description={description} level="h1" />
		</Section>
	)
}
