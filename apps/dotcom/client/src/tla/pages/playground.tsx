/* eslint-disable react/jsx-no-literals */
import { TlaSidebarCreateFileButton } from '../components/TlaSidebar/components/TlaSidebarCreateFileButton.tsx'
import { TlaSidebarFileLinkInner } from '../components/TlaSidebar/components/TlaSidebarFileLink'
import { TlaSidebarFileSection } from '../components/TlaSidebar/components/TlaSidebarFileSection'
import { TlaSidebarToggle } from '../components/TlaSidebar/components/TlaSidebarToggle'
import { TlaSidebarToggleMobile } from '../components/TlaSidebar/components/TlaSidebarToggleMobile'
import { TlaSidebarUserLink } from '../components/TlaSidebar/components/TlaSidebarUserLink'
import { TlaSidebarWorkspaceLink } from '../components/TlaSidebar/components/TlaSidebarWorkspaceLink'
import { TlaSidebar } from '../components/TlaSidebar/TlaSidebar'
import { F } from '../utils/i18n'

export function Component() {
	return (
		<div className="tla-playground">
			<h1>Playground</h1>
			<h2>Sidebar</h2>
			<h3>Sidebar</h3>
			<div style={{ position: 'relative', height: 844, width: 320 }}>
				<TlaSidebar />
			</div>
			<div
				style={{ width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 8 }}
			>
				<h3>Create file button</h3>
				<TlaSidebarCreateFileButton />
				<h3>Sidebar toggle</h3>
				<TlaSidebarToggle />
				<TlaSidebarToggleMobile />
				<h3>Sidebar workspace link</h3>
				<TlaSidebarWorkspaceLink />
				<h3>Sidebar user link</h3>
				<TlaSidebarUserLink />
				<h3>Sidebar file link</h3>
				<TlaSidebarFileLinkInner
					fileId={'123'}
					testId={`tla-file-link-0`}
					isActive={false}
					isOwnFile={true}
					fileName={'My file'}
					href={'/file/123'}
				/>
				<TlaSidebarFileLinkInner
					fileId={'123'}
					testId={`tla-file-link-0`}
					isActive={true}
					isOwnFile={false}
					fileName={'My file'}
					href={'/file/123'}
				/>
				<TlaSidebarFileLinkInner
					fileId={'123'}
					testId={`tla-file-link-0`}
					isActive={false}
					isOwnFile={false}
					fileName={'My file'}
					href={'/file/123'}
				/>
				<TlaSidebarFileLinkInner
					fileId={'123'}
					testId={`tla-file-link-0`}
					isActive={true}
					isOwnFile={true}
					fileName={'My file'}
					href={'/file/123'}
				/>
				<TlaSidebarFileLinkInner
					fileId={'123'}
					testId={`tla-file-link-0`}
					isActive={true}
					isOwnFile={true}
					fileName={'My file'}
					href={'/file/123'}
					debugIsRenaming={true}
				/>
				<h3>Sidebar file section</h3>
				<TlaSidebarFileSection title={<F defaultMessage="Today" />}>
					<TlaSidebarFileLinkInner
						fileId={'123'}
						testId={`tla-file-link-0`}
						isActive={false}
						isOwnFile={true}
						fileName={'My file'}
						href={'/file/123'}
					/>
					<TlaSidebarFileLinkInner
						fileId={'123'}
						testId={`tla-file-link-0`}
						isActive={false}
						isOwnFile={true}
						fileName={'My file'}
						href={'/file/123'}
					/>
					<TlaSidebarFileLinkInner
						fileId={'123'}
						testId={`tla-file-link-0`}
						isActive={false}
						isOwnFile={true}
						fileName={'My file'}
						href={'/file/123'}
					/>
				</TlaSidebarFileSection>
			</div>
		</div>
	)
}
