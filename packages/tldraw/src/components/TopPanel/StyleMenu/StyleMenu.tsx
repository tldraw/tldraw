import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {
  TextAlignCenterIcon,
  TextAlignJustifyIcon,
  TextAlignLeftIcon,
  TextAlignRightIcon,
} from '@radix-ui/react-icons'
import * as React from 'react'
import { FormattedMessage, useIntl } from 'react-intl'
import { Divider } from '~components/Primitives/Divider'
import { DMCheckboxItem, DMContent, DMRadioItem } from '~components/Primitives/DropdownMenu'
import { ToolButton } from '~components/Primitives/ToolButton'
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
import { breakpoints } from '~components/breakpoints'
import { preventEvent } from '~components/preventEvent'
import { useTldrawApp } from '~hooks'
import { defaultTextStyle, fills, strokes } from '~state/shapes/shared'
import { styled } from '~styles'
import {
  AlignStyle,
  ColorStyle,
  DashStyle,
  FontStyle,
  ShapeStyles,
  SizeStyle,
  TDShapeType,
  TDSnapshot,
} from '~types'

const currentStyleSelector = (s: TDSnapshot) => s.appState.currentStyle
const selectedIdsSelector = (s: TDSnapshot) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds

const STYLE_KEYS = Object.keys(defaultTextStyle) as (keyof ShapeStyles)[]

const DASH_ICONS = {
  [DashStyle.Draw]: <DashDrawIcon />,
  [DashStyle.Solid]: <DashSolidIcon />,
  [DashStyle.Dashed]: <DashDashedIcon />,
  [DashStyle.Dotted]: <DashDottedIcon />,
}

const SIZE_ICONS = {
  [SizeStyle.Small]: <SizeSmallIcon />,
  [SizeStyle.Medium]: <SizeMediumIcon />,
  [SizeStyle.Large]: <SizeLargeIcon />,
}

const ALIGN_ICONS = {
  [AlignStyle.Start]: <TextAlignLeftIcon />,
  [AlignStyle.Middle]: <TextAlignCenterIcon />,
  [AlignStyle.End]: <TextAlignRightIcon />,
  [AlignStyle.Justify]: <TextAlignJustifyIcon />,
}

const themeSelector = (s: TDSnapshot) => (s.settings.isDarkMode ? 'dark' : 'light')

const keepOpenSelector = (s: TDSnapshot) => s.settings.keepStyleMenuOpen

const optionsSelector = (s: TDSnapshot) => {
  const { activeTool, currentPageId: pageId } = s.appState
  switch (activeTool) {
    case 'select': {
      const page = s.document.pages[pageId]
      let hasText = false
      let hasLabel = false
      for (const id of s.document.pageStates[pageId].selectedIds) {
        if ('text' in page.shapes[id]) hasText = true
        if ('label' in page.shapes[id]) hasLabel = true
      }
      return hasText ? 'text' : hasLabel ? 'label' : ''
    }
    case TDShapeType.Text: {
      return 'text'
    }
    case TDShapeType.Rectangle: {
      return 'label'
    }
    case TDShapeType.Ellipse: {
      return 'label'
    }
    case TDShapeType.Triangle: {
      return 'label'
    }
    case TDShapeType.Arrow: {
      return 'label'
    }
    case TDShapeType.Line: {
      return 'label'
    }
  }

  return false
}

export const StyleMenu = React.memo(function ColorMenu() {
  const app = useTldrawApp()

  const intl = useIntl()

  const theme = app.useStore(themeSelector)

  const keepOpen = app.useStore(keepOpenSelector)

  const options = app.useStore(optionsSelector)

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
    // Until we can work out the correct logic for deciding whether or not to
    // update the selected style, do a string comparison. Yuck!
    if (JSON.stringify(commonStyle) !== JSON.stringify(rDisplayedStyle.current)) {
      rDisplayedStyle.current = commonStyle
      setDisplayedStyle(commonStyle)
    }
  }, [currentStyle, selectedIds])

  const handleToggleKeepOpen = React.useCallback((checked: boolean) => {
    app.setSetting('keepStyleMenuOpen', checked)
  }, [])

  const handleToggleFilled = React.useCallback((checked: boolean) => {
    app.style({ isFilled: checked })
  }, [])

  const handleDashChange = React.useCallback((value: string) => {
    app.style({ dash: value as DashStyle })
  }, [])

  const handleSizeChange = React.useCallback((value: string) => {
    app.style({ size: value as SizeStyle })
  }, [])

  const handleFontChange = React.useCallback((value: string) => {
    app.style({ font: value as FontStyle })
  }, [])

  const handleTextAlignChange = React.useCallback((value: string) => {
    app.style({ textAlign: value as AlignStyle })
  }, [])

  const handleMenuOpenChange = React.useCallback(
    (open: boolean) => {
      app.setMenuOpen(open)
    },
    [app]
  )

  return (
    <DropdownMenu.Root
      dir="ltr"
      onOpenChange={handleMenuOpenChange}
      open={keepOpen ? true : undefined}
    >
      <DropdownMenu.Trigger asChild id="TD-Styles">
        <ToolButton aria-label={intl.formatMessage({ id: 'styles' })} variant="text">
          <FormattedMessage id="styles" />
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
            {DASH_ICONS[displayedStyle.dash]}
          </OverlapIcons>
        </ToolButton>
      </DropdownMenu.Trigger>
      <DMContent id="TD-StylesMenu" side="bottom" align="end" sideOffset={4} alignOffset={4}>
        <StyledRow variant="tall" id="TD-Styles-Color-Container">
          <span>
            <FormattedMessage id="style.menu.color" />
          </span>
          <ColorGrid>
            {Object.keys(strokes.light).map((style: string) => (
              <DropdownMenu.Item
                key={style}
                onSelect={preventEvent}
                asChild
                id={`TD-Styles-Color-Swatch-${style}`}
              >
                <ToolButton
                  variant="icon"
                  isActive={displayedStyle.color === style}
                  onClick={() => app.style({ color: style as ColorStyle })}
                  aria-label={intl.formatMessage({ id: style })}
                >
                  <CircleIcon
                    size={18}
                    strokeWidth={2.5}
                    fill={
                      displayedStyle.isFilled ? fills[theme][style as ColorStyle] : 'transparent'
                    }
                    stroke={strokes.light[style as ColorStyle]}
                  />
                </ToolButton>
              </DropdownMenu.Item>
            ))}
          </ColorGrid>
        </StyledRow>
        <DMCheckboxItem
          variant="styleMenu"
          checked={!!displayedStyle.isFilled}
          onCheckedChange={handleToggleFilled}
          id="TD-Styles-Fill"
        >
          <FormattedMessage id="style.menu.fill" />
        </DMCheckboxItem>
        <StyledRow id="TD-Styles-Dash-Container">
          <FormattedMessage id="style.menu.dash" />
          <StyledGroup dir="ltr" value={displayedStyle.dash} onValueChange={handleDashChange}>
            {Object.values(DashStyle).map((style) => (
              <DMRadioItem
                key={style}
                isActive={style === displayedStyle.dash}
                value={style}
                onSelect={preventEvent}
                bp={breakpoints}
                id={`TD-Styles-Dash-${style}`}
                aria-label={intl.formatMessage({ id: style })}
              >
                {DASH_ICONS[style as DashStyle]}
              </DMRadioItem>
            ))}
          </StyledGroup>
        </StyledRow>
        <StyledRow id="TD-Styles-Size-Container">
          <FormattedMessage id="style.menu.size" />
          <StyledGroup dir="ltr" value={displayedStyle.size} onValueChange={handleSizeChange}>
            {Object.values(SizeStyle).map((sizeStyle) => (
              <DMRadioItem
                key={sizeStyle}
                isActive={sizeStyle === displayedStyle.size}
                value={sizeStyle}
                onSelect={preventEvent}
                bp={breakpoints}
                id={`TD-Styles-Dash-${sizeStyle}`}
                aria-label={intl.formatMessage({ id: sizeStyle })}
              >
                {SIZE_ICONS[sizeStyle as SizeStyle]}
              </DMRadioItem>
            ))}
          </StyledGroup>
        </StyledRow>
        {(options === 'text' || options === 'label') && (
          <>
            <Divider />
            <StyledRow id="TD-Styles-Font-Container">
              <FormattedMessage id="style.menu.font" />
              <StyledGroup dir="ltr" value={displayedStyle.font} onValueChange={handleFontChange}>
                {Object.values(FontStyle).map((fontStyle) => (
                  <DMRadioItem
                    key={fontStyle}
                    isActive={fontStyle === displayedStyle.font}
                    value={fontStyle}
                    onSelect={preventEvent}
                    bp={breakpoints}
                    id={`TD-Styles-Font-${fontStyle}`}
                  >
                    <FontIcon fontStyle={fontStyle}>Aa</FontIcon>
                  </DMRadioItem>
                ))}
              </StyledGroup>
            </StyledRow>
            {options === 'text' && (
              <StyledRow id="TD-Styles-Align-Container">
                <FormattedMessage id="style.menu.align" />
                <StyledGroup
                  dir="ltr"
                  value={displayedStyle.textAlign}
                  onValueChange={handleTextAlignChange}
                >
                  {Object.values(AlignStyle).map((style) => (
                    <DMRadioItem
                      key={style}
                      isActive={style === displayedStyle.textAlign}
                      value={style}
                      onSelect={preventEvent}
                      bp={breakpoints}
                      id={`TD-Styles-Align-${style}`}
                    >
                      {ALIGN_ICONS[style]}
                    </DMRadioItem>
                  ))}
                </StyledGroup>
              </StyledRow>
            )}
          </>
        )}
        <Divider />
        <DMCheckboxItem
          variant="styleMenu"
          checked={keepOpen}
          onCheckedChange={handleToggleKeepOpen}
          id="TD-Styles-Keep-Open"
        >
          <FormattedMessage id="style.menu.keep.open" />
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
  padding: '$2 0 $2 $3',
  borderRadius: 4,
  userSelect: 'none',
  WebkitUserSelect: 'none',
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
        padding: '0 0 0 $3',
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
  gap: '$1',
})

const OverlapIcons = styled('div', {
  display: 'grid',
  '& > *': {
    gridColumn: 1,
    gridRow: 1,
  },
})

const FontIcon = styled('div', {
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '$3',
  variants: {
    fontStyle: {
      [FontStyle.Script]: {
        fontFamily: 'Caveat Brush',
      },
      [FontStyle.Sans]: {
        fontFamily: 'Recursive',
      },
      [FontStyle.Serif]: {
        fontFamily: 'Georgia',
      },
      [FontStyle.Mono]: {
        fontFamily: 'Recursive Mono',
      },
    },
  },
})
