import classNames from 'classnames'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import { TlDialogsProvider } from '../components/TlDialogs'
import { TlToastsProvider } from '../components/TlToasts'
import { TlTooltipProvider } from '../components/TlTooltip'
import { TlBreakpointProvider } from './breakpoint'
import { TlIconProvider } from './icons'
import { TlMenuStateProvider } from './menu-state'
import { TlPlatformProvider, useTlPlatform } from './platform'
import { TlPortalProvider } from './portal'
import { TlTranslationProvider } from './translation'

/** @public */
export interface TlUiProviderProps {
	theme?: 'light' | 'dark'
	dir?: 'ltr' | 'rtl'
	msg?(key: string): string | undefined
	iconAssetUrls?: Record<string, string>
	container?: HTMLElement | null
	breakpoint?: number
	onMenuOpenChange?(id: string, isOpen: boolean): void
	className?: string
	children: ReactNode
}

/** @public @react */
export function TlUiProvider({
	theme = 'light',
	dir,
	msg,
	iconAssetUrls,
	container,
	breakpoint,
	onMenuOpenChange,
	className,
	children,
}: TlUiProviderProps) {
	const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(container ?? null)
	const rootRef = useCallback(
		(node: HTMLDivElement | null) => {
			if (!container) {
				setPortalContainer(node)
			}
		},
		[container]
	)

	useEffect(() => {
		if (container !== undefined) {
			setPortalContainer(container)
		}
	}, [container])

	const resolvedContainer = container ?? portalContainer

	return (
		<TlTranslationProvider dir={dir} msg={msg}>
			<TlPlatformProvider>
				<TlPortalProvider container={resolvedContainer}>
					<TlIconProvider assetUrls={iconAssetUrls ?? {}}>
						<TlMenuStateProvider onMenuOpenChange={onMenuOpenChange}>
							{breakpoint !== undefined ? (
								<TlBreakpointProvider breakpoint={breakpoint}>
									<TlUiRoot rootRef={rootRef} dir={dir} theme={theme} className={className}>
										{children}
									</TlUiRoot>
								</TlBreakpointProvider>
							) : (
								<TlUiRoot rootRef={rootRef} dir={dir} theme={theme} className={className}>
									{children}
								</TlUiRoot>
							)}
						</TlMenuStateProvider>
					</TlIconProvider>
				</TlPortalProvider>
			</TlPlatformProvider>
		</TlTranslationProvider>
	)
}

interface TlUiRootProps {
	rootRef(node: HTMLDivElement | null): void
	dir?: 'ltr' | 'rtl'
	theme: 'light' | 'dark'
	className?: string
	children: ReactNode
}

function TlUiRoot({ rootRef, dir, theme, className, children }: TlUiRootProps) {
	const { isCoarsePointer } = useTlPlatform()

	return (
		<TlTooltipProvider>
			<div
				ref={rootRef}
				dir={dir}
				data-coarse={isCoarsePointer || undefined}
				className={classNames(
					'tl-ui',
					theme === 'dark' ? 'tl-ui--dark' : 'tl-ui--light',
					className
				)}
			>
				<TlToastsProvider>
					<TlDialogsProvider>{children}</TlDialogsProvider>
				</TlToastsProvider>
			</div>
		</TlTooltipProvider>
	)
}
