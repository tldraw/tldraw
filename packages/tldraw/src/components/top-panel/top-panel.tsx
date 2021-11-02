import * as React from 'react'
import { Menu } from './menu'
import css from '~styles'
import { Pages } from './pages'
import { ZoomCounter } from './zoom'
import { DashMenu } from './dash-menu'
import { SizeMenu } from './size-menu'
import { FillCheckbox } from './fill-checkbox'
import { ColorMenu } from './color-menu'
import { buttonsContainer } from '~components/tools-panel/styled'
import { breakpoints } from '~components/shared'

export function TopPanel() {
  return (
    <div className={topPanel({ bp: breakpoints })}>
      <div className={buttonsContainer({ side: 'left', bp: breakpoints })}>
        <Menu />
        <Pages />
      </div>
      <div className={spacer({ bp: breakpoints })} />
      <div className={buttonsContainer({ side: 'right', bp: breakpoints })}>
        <ColorMenu />
        <SizeMenu />
        <DashMenu />
        <FillCheckbox />
        <ZoomCounter />
      </div>
    </div>
  )
}

const topPanel = css({
  width: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  // height: 48,
  // backgroundColor: '$panel',
  // borderBottom: '1px solid $panelBorder',
  display: 'flex',
  flexDirection: 'row',
  // alignItems: 'center',
  // justifyContent: 'flex-start',
})

const spacer = css({
  flexGrow: 2,
})
