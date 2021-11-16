import * as React from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { strokes, fills } from '~state/shapes/shared/shape-styles'
import { useTldrawApp } from '~hooks'
import { DMCheckboxItem, DMContent, DMRadioItem, DMTriggerIcon } from '~components/DropdownMenu'
import {
  CircleIcon,
  DashDashedIcon,
  DashDottedIcon,
  DashDrawIcon,
  DashSolidIcon,
  SizeLargeIcon,
  SizeMediumIcon,
  SizeSmallIcon,
} from '~components/icons'
import { ToolButton } from '~components/ToolButton'
import { TDSnapshot, ColorStyle, DashStyle, SizeStyle } from '~types'
import { styled } from '~styles'
import { breakpoints } from '~components/breakpoints'
import { Divider } from '~components/Divider'
import { preventEvent } from '~components/preventEvent'

const selectedStyleSelector = (s: TDSnapshot) => s.appState.selectedStyle

const dashes = {
  [DashStyle.Draw]: <DashDrawIcon />,
  [DashStyle.Solid]: <DashSolidIcon />,
  [DashStyle.Dashed]: <DashDashedIcon />,
  [DashStyle.Dotted]: <DashDottedIcon />,
}

const sizes = {
  [SizeStyle.Small]: <SizeSmallIcon />,
  [SizeStyle.Medium]: <SizeMediumIcon />,
  [SizeStyle.Large]: <SizeLargeIcon />,
}

const themeSelector = (data: TDSnapshot) => (data.settings.isDarkMode ? 'dark' : 'light')

export const StyleMenu = React.memo(function ColorMenu(): JSX.Element {
  const app = useTldrawApp()

  const theme = app.useStore(themeSelector)

  const style = app.useStore(selectedStyleSelector)

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
            color: strokes[theme][style.color as ColorStyle],
          }}
        >
          {style.isFilled && (
            <CircleIcon size={16} stroke="none" fill={fills[theme][style.color as ColorStyle]} />
          )}
          {dashes[style.dash]}
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
                  isActive={style.color === colorStyle}
                  onClick={() => app.style({ color: colorStyle as ColorStyle })}
                >
                  <CircleIcon
                    size={18}
                    strokeWidth={2.5}
                    fill={style.isFilled ? fills.light[colorStyle as ColorStyle] : 'transparent'}
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
          <StyledGroup dir="ltr" value={style.dash} onValueChange={handleDashChange}>
            {Object.values(DashStyle).map((dashStyle) => (
              <DMRadioItem
                key={dashStyle}
                isActive={dashStyle === style.dash}
                value={dashStyle}
                onSelect={preventEvent}
                bp={breakpoints}
              >
                {dashes[dashStyle as DashStyle]}
              </DMRadioItem>
            ))}
          </StyledGroup>
        </StyledRow>
        <Divider />
        <StyledRow>
          Size
          <StyledGroup dir="ltr" value={style.size} onValueChange={handleSizeChange}>
            {Object.values(SizeStyle).map((sizeStyle) => (
              <DMRadioItem
                key={sizeStyle}
                isActive={sizeStyle === style.size}
                value={sizeStyle}
                onSelect={preventEvent}
                bp={breakpoints}
              >
                {sizes[sizeStyle as SizeStyle]}
              </DMRadioItem>
            ))}
          </StyledGroup>
        </StyledRow>
        <Divider />
        <DMCheckboxItem checked={!!style.isFilled} onCheckedChange={handleToggleFilled}>
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
