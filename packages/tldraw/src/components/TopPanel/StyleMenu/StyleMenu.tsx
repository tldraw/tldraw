import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { strokes, fills, defaultStyle } from '~state/shapes/shared/shape-styles'
import { useTldrawApp } from '~hooks'
import {
  DMCheckboxItem,
  DMContent,
  DMRadioItem,
  DMTriggerIcon,
} from '~components/Primitives/DropdownMenu'
import {
  CircleIcon,
  DashDashedIcon,
  DashDottedIcon,
  DashDrawIcon,
  DashSolidIcon,
  SizeLargeIcon,
  SizeMediumIcon,
  SizeSmallIcon,
} from '~components/Primitives/icons'
import { ToolButton } from '~components/Primitives/ToolButton'
import { TDSnapshot, ColorStyle, DashStyle, SizeStyle, ShapeStyles } from '~types'
import { styled } from '~styles'
import { breakpoints } from '~components/breakpoints'
import { Divider } from '~components/Primitives/Divider'
import { preventEvent } from '~components/preventEvent'

const currentStyleSelector = (s: TDSnapshot) => s.appState.currentStyle
const selectedIdsSelector = (s: TDSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds

const STYLE_KEYS = Object.keys(defaultStyle) as (keyof ShapeStyles)[]

const DASHES = {
  [DashStyle.Draw]: <DashDrawIcon />,
  [DashStyle.Solid]: <DashSolidIcon />,
  [DashStyle.Dashed]: <DashDashedIcon />,
  [DashStyle.Dotted]: <DashDottedIcon />,
}

const SIZES = {
  [SizeStyle.Small]: <SizeSmallIcon />,
  [SizeStyle.Medium]: <SizeMediumIcon />,
  [SizeStyle.Large]: <SizeLargeIcon />,
}

const themeSelector = (data: TDSnapshot) => (data.settings.isDarkMode ? 'dark' : 'light')

export const StyleMenu = React.memo(function ColorMenu(): JSX.Element {
  const app = useTldrawApp()

  const theme = app.useStore(themeSelector)

  const currentStyle = app.useStore(currentStyleSelector)
  const selectedIds = app.useStore(selectedIdsSelector)

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
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              commonStyle[key] = shape.style[key]
            } else {
              if (commonStyle[key] === shape.style[key]) return
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              commonStyle[key] = shape.style[key]
              overrides.add(key)
            }
          })
        })
    }

    // Until we can work out the correct logic for deciding whether or not to
    // update the selected style, do a string comparison. Yuck!
    if (JSON.stringify(commonStyle) !== JSON.stringify(rDisplayedStyle.current)) {
      rDisplayedStyle.current = commonStyle
      setDisplayedStyle(commonStyle)
    }
  }, [currentStyle, selectedIds])

  const handleToggleFilled = React.useCallback((checked: boolean) => {
    app.style({ isFilled: checked })
  }, [])

  const handleDashChange = React.useCallback((value: string) => {
    app.style({ dash: value as DashStyle })
  }, [])

  const handleSizeChange = React.useCallback((value: string) => {
    app.style({ size: value as SizeStyle })
  }, [])

  return (
    <DropdownMenu.Root dir="ltr">
      <DMTriggerIcon>
        <OverlapIcons
          style={{
            color: strokes[theme][displayedStyle.color as ColorStyle],
          }}
        >
          {displayedStyle.isFilled && (
            <CircleIcon
              size={16}
              stroke="none"
              fill={fills[theme][displayedStyle.color as ColorStyle]}
            />
          )}
          {DASHES[displayedStyle.dash]}
        </OverlapIcons>
      </DMTriggerIcon>
      <DMContent>
        <StyledRow variant="tall">
          <span>Color</span>
          <ColorGrid>
            {Object.keys(strokes.light).map((colorStyle: string) => (
              <DropdownMenu.Item key={colorStyle} onSelect={preventEvent} asChild>
                <ToolButton
                  variant="icon"
                  isActive={displayedStyle.color === colorStyle}
                  onClick={() => app.style({ color: colorStyle as ColorStyle })}
                >
                  <CircleIcon
                    size={18}
                    strokeWidth={2.5}
                    fill={
                      displayedStyle.isFilled
                        ? fills.light[colorStyle as ColorStyle]
                        : 'transparent'
                    }
                    stroke={strokes.light[colorStyle as ColorStyle]}
                  />
                </ToolButton>
              </DropdownMenu.Item>
            ))}
          </ColorGrid>
        </StyledRow>
        <Divider />
        <StyledRow>
          Dash
          <StyledGroup dir="ltr" value={displayedStyle.dash} onValueChange={handleDashChange}>
            {Object.values(DashStyle).map((dashStyle) => (
              <DMRadioItem
                key={dashStyle}
                isActive={dashStyle === displayedStyle.dash}
                value={dashStyle}
                onSelect={preventEvent}
                bp={breakpoints}
              >
                {DASHES[dashStyle as DashStyle]}
              </DMRadioItem>
            ))}
          </StyledGroup>
        </StyledRow>
        <Divider />
        <StyledRow>
          Size
          <StyledGroup dir="ltr" value={displayedStyle.size} onValueChange={handleSizeChange}>
            {Object.values(SizeStyle).map((sizeStyle) => (
              <DMRadioItem
                key={sizeStyle}
                isActive={sizeStyle === displayedStyle.size}
                value={sizeStyle}
                onSelect={preventEvent}
                bp={breakpoints}
              >
                {SIZES[sizeStyle as SizeStyle]}
              </DMRadioItem>
            ))}
          </StyledGroup>
        </StyledRow>
        <Divider />
        <DMCheckboxItem checked={!!displayedStyle.isFilled} onCheckedChange={handleToggleFilled}>
          Fill
        </DMCheckboxItem>
      </DMContent>
    </DropdownMenu.Root>
  )
})

const ColorGrid = styled('div', {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, auto)',
  gap: 0,
})

// const StyledRowInner = styled('div', {
//   height: '100%',
//   width: '100%',
//   backgroundColor: '$panel',
//   borderRadius: '$2',
//   display: 'flex',
//   gap: '$1',
//   flexDirection: 'row',
//   alignItems: 'center',
//   padding: '0 $3',
//   justifyContent: 'space-between',
//   border: '1px solid transparent',

//   '& svg': {
//     position: 'relative',
//     stroke: '$overlay',
//     strokeWidth: 1,
//     zIndex: 1,
//   },
// })

export const StyledRow = styled('div', {
  position: 'relative',
  width: '100%',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  minHeight: '32px',
  outline: 'none',
  color: '$text',
  fontFamily: '$ui',
  fontWeight: 400,
  fontSize: '$1',
  padding: '0 0 0 $3',
  borderRadius: 4,
  userSelect: 'none',
  margin: 0,
  display: 'flex',
  gap: '$3',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  variants: {
    variant: {
      tall: {
        alignItems: 'flex-start',
        '& > span': {
          paddingTop: '$4',
        },
      },
    },
  },
})

const StyledGroup = styled(DropdownMenu.DropdownMenuRadioGroup, {
  display: 'flex',
  flexDirection: 'row',
})

const OverlapIcons = styled('div', {
  display: 'grid',
  '& > *': {
    gridColumn: 1,
    gridRow: 1,
  },
})
