import * as React from 'react'
import { floatingContainer, rowButton } from '../shared'
import css from '~styles'
import type { Data } from '~types'
import { useTLDrawContext } from '~hooks'

const isEmptyCanvasSelector = (s: Data) =>
  Object.keys(s.document.pages[s.appState.currentPageId].shapes).length > 0 &&
  s.appState.isEmptyCanvas

export const BackToContent = React.memo(() => {
  const { tlstate, useSelector } = useTLDrawContext()

  const isEmptyCanvas = useSelector(isEmptyCanvasSelector)

  if (!isEmptyCanvas) return null

  return (
    <div className={backToContentButton()}>
      <button className={rowButton()} onClick={tlstate.zoomToContent}>
        Back to content
      </button>
    </div>
  )
})

const backToContentButton = css(floatingContainer, {
  pointerEvents: 'all',
  width: 'fit-content',
  gridRow: 1,
  flexGrow: 2,
  display: 'block',
})
