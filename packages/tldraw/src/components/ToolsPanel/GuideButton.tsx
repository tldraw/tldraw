import * as React from 'react'
import { Tooltip } from '~components/Tooltip'
import { useTldrawApp } from '~hooks'
import { ToolButton } from '~components/ToolButton'
import { styled } from '~styles'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  BookmarkIcon,
  Cross2Icon,
  QuestionMarkCircledIcon,
  QuestionMarkIcon,
} from '@radix-ui/react-icons'
import type { TDSnapshot } from '~types'
import { Panel } from '~components/Panel'
import { breakpoints } from '~components/breakpoints'

const guideIsOpenSelector = (s: TDSnapshot) => s.appState.isGuideOpen

export function GuideButton(): JSX.Element {
  const app = useTldrawApp()

  const isOpen = app.useStore(guideIsOpenSelector)

  const handleToggleIsOpen = React.useCallback(() => {
    app.toggleGuidePanel()
  }, [app])

  return (
    <DropdownMenu.Root dir="ltr" open={isOpen}>
      <DropdownMenu.Trigger dir="ltr" asChild>
        <ToolButton variant="circle" onSelect={handleToggleIsOpen}>
          {isOpen ? <Cross2Icon /> : <QuestionMarkIcon />}
        </ToolButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        dir="ltr"
        side="top"
        align="center"
        alignOffset={8}
        sideOffset={8}
        asChild
      >
        <GuideContainer side="guide">
          <iframe
            id="guide-viewer"
            title="tldraw Guide"
            width="100%"
            height="100%"
            src="/guide/intro"
          />
          <CloseButton onClick={handleToggleIsOpen}>
            <Cross2Icon />
          </CloseButton>
        </GuideContainer>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
}

const GuideContainer = styled(Panel, {
  width: 420,
  maxWidth: 'calc(100vw - 28px)',
  minWidth: 0,
  height: 500,
  maxHeight: '50vh',
  minHeight: 0,
  overflow: 'hidden',
  borderRadius: '$3',
  '& iframe': {
    border: 'none',
  },
})

const CloseButton = styled('button', {
  position: 'absolute',
  top: 0,
  right: 0,
  padding: '$3',
  background: 'none',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
})
