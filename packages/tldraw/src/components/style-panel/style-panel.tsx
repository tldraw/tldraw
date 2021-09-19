import * as React from 'react'
import { Utils } from '@tldraw/core'
import { DotsHorizontalIcon, Cross2Icon } from '@radix-ui/react-icons'
import { useTLDrawContext } from '~hooks'
import type { Data } from '~types'
import { ShapesFunctions } from './shapes-functions'
import { AlignDistribute } from './align-distribute'
import { QuickColorSelect } from './quick-color-select'
import { QuickSizeSelect } from './quick-size-select'
import { QuickDashSelect } from './quick-dash-select'
import { QuickFillSelect } from './quick-fill-select'
import { Tooltip } from '../shared/tooltip'
import { kbd } from '../shared/kbd'
import {
  iconButton,
  buttonsRow,
  breakpoints,
  rowButton,
  floatingContainer,
  divider,
} from '../shared'

const isStyleOpenSelector = (s: Data) => s.appState.isStyleOpen

export function StylePanel(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()
  const isOpen = useSelector(isStyleOpenSelector)

  return (
    <div className={floatingContainer({ direction: 'column' })}>
      <div className={buttonsRow()}>
        <QuickColorSelect />
        <QuickSizeSelect />
        <QuickDashSelect />
        <QuickFillSelect />
        <button
          className={iconButton({ bp: breakpoints, size: 'small' })}
          title="Style"
          onPointerDown={tlstate.toggleStylePanel}
        >
          <Tooltip label={isOpen ? 'Close' : 'More'}>
            {isOpen ? <Cross2Icon /> : <DotsHorizontalIcon />}
          </Tooltip>
        </button>
      </div>
      {isOpen && <SelectedShapeContent />}
    </div>
  )
}

const showKbds = !Utils.isMobileSize()

const selectedShapesCountSelector = (s: Data) =>
  s.document.pageStates[s.appState.currentPageId].selectedIds.length

function SelectedShapeContent(): JSX.Element {
  const { tlstate, useSelector } = useTLDrawContext()
  const selectedShapesCount = useSelector(selectedShapesCountSelector)

  const handleCopy = React.useCallback(() => {
    tlstate.copy()
  }, [tlstate])

  const handlePaste = React.useCallback(() => {
    tlstate.paste()
  }, [tlstate])

  const handleCopySvg = React.useCallback(() => {
    tlstate.copySvg()
  }, [tlstate])

  return (
    <>
      <div className={divider()} />
      <ShapesFunctions />
      <div className={divider()} />
      <AlignDistribute
        hasTwoOrMore={selectedShapesCount > 1}
        hasThreeOrMore={selectedShapesCount > 2}
      />
      <div className={divider()} />
      <button
        className={rowButton({ bp: breakpoints })}
        disabled={selectedShapesCount === 0}
        onClick={handleCopy}
      >
        <span>Copy</span>
        {showKbds && <kbd className={kbd({ variant: 'menu' })}>#C</kbd>}
      </button>
      <button className={rowButton({ bp: breakpoints })} onClick={handlePaste}>
        <span>Paste</span>
        {showKbds && <kbd className={kbd({ variant: 'menu' })}>#V</kbd>}
      </button>
      <button className={rowButton({ bp: breakpoints })} onClick={handleCopySvg}>
        <span>Copy to SVG</span>
        {showKbds && <kbd className={kbd({ variant: 'menu' })}>⇧#C</kbd>}
      </button>
    </>
  )
}
