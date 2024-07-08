import { ReactNode } from 'react'
import { TlaSidebar } from './TlaSidebar'

export function TlaWrapperWithSidebar({ children }: { children: ReactNode }) {
	return (
		<div className="tla tla_layout" data-sidebar={true}>
			<TlaSidebar />
			{children}
		</div>
	)
}
