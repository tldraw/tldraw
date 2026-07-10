import classNames from 'classnames'
import { ReactNode, useCallback, useEffect, useState } from 'react'
import { TldrawUiDialogsProvider } from '../components/TldrawUiDialogs'
import { TldrawUiToastsProvider } from '../components/TldrawUiToasts'
import { TldrawUiTooltipProvider } from '../components/TldrawUiTooltip'
import { TldrawUiBreakpointProvider } from './breakpoint'
import { TldrawUiIconProvider } from './icons'
import { TldrawUiMenuStateProvider } from './menu-state'
import { TldrawUiPlatformProvider, useTldrawUiPlatform } from './platform'
import { TldrawUiPortalProvider } from './portal'
import { TldrawUiTranslationProvider } from './translation'

/** @public */
export interface TldrawUiProviderProps {
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
export function TldrawUiProvider({
	theme = 'light',
	dir,
	msg,
	iconAssetUrls,
	container,
	breakpoint,
	onMenuOpenChange,
	className,
	children,
}: TldrawUiProviderProps) {
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
		<TldrawUiTranslationProvider dir={dir} msg={msg}>
			<TldrawUiPlatformProvider>
				<TldrawUiPortalProvider container={resolvedContainer}>
					<TldrawUiIconProvider assetUrls={iconAssetUrls ?? {}}>
						<TldrawUiMenuStateProvider onMenuOpenChange={onMenuOpenChange}>
							{breakpoint !== undefined ? (
								<TldrawUiBreakpointProvider breakpoint={breakpoint}>
									<TldrawUiRoot rootRef={rootRef} dir={dir} theme={theme} className={className}>
										{children}
									</TldrawUiRoot>
								</TldrawUiBreakpointProvider>
							) : (
								<TldrawUiRoot rootRef={rootRef} dir={dir} theme={theme} className={className}>
									{children}
								</TldrawUiRoot>
							)}
						</TldrawUiMenuStateProvider>
					</TldrawUiIconProvider>
				</TldrawUiPortalProvider>
			</TldrawUiPlatformProvider>
		</TldrawUiTranslationProvider>
	)
}

interface TldrawUiRootProps {
	rootRef(node: HTMLDivElement | null): void
	dir?: 'ltr' | 'rtl'
	theme: 'light' | 'dark'
	className?: string
	children: ReactNode
}

function TldrawUiRoot({ rootRef, dir, theme, className, children }: TldrawUiRootProps) {
	const { isCoarsePointer } = useTldrawUiPlatform()

	return (
		<TldrawUiTooltipProvider>
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
				<TldrawUiToastsProvider>
					<TldrawUiDialogsProvider>{children}</TldrawUiDialogsProvider>
				</TldrawUiToastsProvider>
			</div>
		</TldrawUiTooltipProvider>
	)
}
