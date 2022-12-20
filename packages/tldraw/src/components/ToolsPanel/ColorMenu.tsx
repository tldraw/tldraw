import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as React from 'react'
import { ToolButton } from '~components/Primitives/ToolButton'
import { StyledIcon } from '~components/Primitives/icons/icoStyled'
import { preventEvent } from '~components/preventEvent'
import { useTldrawApp } from '~hooks'
import { defaultTextStyle, strokes } from '~state/shapes/shared'
import { styled } from '~styles'
import { ColorStyle, ShapeStyles, TDSnapshot } from '~types'

const currentStyleSelector = (s: TDSnapshot) => s.appState.currentStyle
const selectedIdsSelector = (s: TDSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds
const themeSelector = (s: TDSnapshot) => (s.settings.isDarkMode ? 'dark' : 'light')
const dockPositionState = (s: TDSnapshot) => s.settings.dockPosition

const STYLE_KEYS = Object.keys(defaultTextStyle) as (keyof ShapeStyles)[]

export const ColorMenu = React.memo(function ColorMenu() {
  const app = useTldrawApp()

  const theme = app.useStore(themeSelector)
  const currentStyle = app.useStore(currentStyleSelector)
  const selectedIds = app.useStore(selectedIdsSelector)
  const dockPosition = app.useStore(dockPositionState)

  const [displayedStyle, setDisplayedStyle] = React.useState(currentStyle)
  const rDisplayedStyle = React.useRef(currentStyle)

  React.useEffect(() => {
    const {
      appState: { currentStyle },
      page,
      selectedIds,
    } = app
    let commonStyle = {} as ShapeStyles
    if (selectedIds.length <= 0) {
      commonStyle = currentStyle
    } else {
      const overrides = new Set<string>([])
      app.selectedIds
        .map((id) => page.shapes[id])
        .forEach((shape) => {
          STYLE_KEYS.forEach((key) => {
            if (overrides.has(key)) return
            if (commonStyle[key] === undefined) {
              // @ts-ignore
              commonStyle[key] = shape.style[key]
            } else {
              if (commonStyle[key] === shape.style[key]) return
              // @ts-ignore
              commonStyle[key] = shape.style[key]
              overrides.add(key)
            }
          })
        })
    }

    if (JSON.stringify(commonStyle) !== JSON.stringify(rDisplayedStyle.current)) {
      rDisplayedStyle.current = commonStyle
      setDisplayedStyle(commonStyle)
    }
  }, [currentStyle, selectedIds])

  const handleMenuOpenChange = React.useCallback(
    (open: boolean) => {
      app.setMenuOpen(open)
    },
    [app]
  )

  const contentSide = dockPosition === 'bottom' || dockPosition === 'top' ? 'top' : dockPosition

  return (
    <DropdownMenu.Root dir="ltr" onOpenChange={handleMenuOpenChange}>
      <DropdownMenu.Trigger asChild id="TD-Color-Styles">
        <ToolButton variant="primary">
          <StyledIcon active={true} color={strokes[theme][displayedStyle.color as ColorStyle]} />
        </ToolButton>
      </DropdownMenu.Trigger>

      <DropdownMenu.Content asChild side={contentSide} sideOffset={12}>
        <StyledColorGrid>
          {Object.keys(strokes.light).map((style: string) => (
            <DropdownMenu.Item
              key={style}
              onSelect={preventEvent}
              asChild
              id={`TD-Color-Styles-Swatch-${style}`}
            >
              <StyledButton
                onClick={() => app.style({ color: style as ColorStyle })}
                isActive={displayedStyle.color === style}
              >
                <StyledIcon
                  active={displayedStyle.color === style}
                  color={strokes.light[style as ColorStyle]}
                />
              </StyledButton>
            </DropdownMenu.Item>
          ))}
        </StyledColorGrid>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  )
})

const StyledColorGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, auto)',
  gap: '$3',
  padding: '$3',
  backgroundColor: '$panel',
  boxShadow: '$panel',
  border: '1px solid $panelContrast',
  overflow: 'hidden',
})

const StyledButton = styled('button', {
  position: 'relative',
  color: '$text',
  fontSize: '$0',
  background: 'none',
  margin: '0',
  padding: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  outline: 'none',
  cursor: 'pointer',
  pointerEvents: 'all',
  height: '24px',
  width: '24px',
  border: 'none',
  variants: {
    isActive: {
      true: {
        backgroundColor: '$selected',
      },
    },
  },
})
