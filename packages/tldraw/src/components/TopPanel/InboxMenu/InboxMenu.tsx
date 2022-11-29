import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import {EnvelopeClosedIcon, EnvelopeOpenIcon} from '@radix-ui/react-icons'
import {supported} from 'browser-fs-access'
import * as React from 'react'
import {FormattedMessage, useIntl} from 'react-intl'
import {FilenameDialog} from '~components/Primitives/AlertDialog'
import {Divider} from '~components/Primitives/Divider'
import {
  DMCheckboxItem,
  DMContent,
  DMItem,
  DMSubMenu,
  DMTriggerIcon,
} from '~components/Primitives/DropdownMenu'
import {preventEvent} from '~components/preventEvent'
import {useTldrawApp} from '~hooks'
import {useFileSystemHandlers} from '~hooks'
import {TDExportType, TDShape, TDSnapshot} from '~types'
import {PreferencesMenu} from '../PreferencesMenu'
import {styled} from "~styles";
import EdubreakService from "~state/services/EdubreakService";
import {stopPropagation} from "~components/stopPropagation";
import {useRef} from "react";

interface InboxMenuProps {
  readOnly: boolean
}

const numberOfSelectedIdsSelector = (s: TDSnapshot) => {
  return s.document.pageStates[s.appState.currentPageId].selectedIds.length
}

const disableAssetsSelector = (s: TDSnapshot) => {
  return s.appState.disableAssets
}

const settingsSelector = (s: TDSnapshot) => s.settings

const openInboxSelector = (s: TDSnapshot) => s.settings.openInbox

export const InboxMenu = React.memo(function InboxMenu({readOnly}: InboxMenuProps) {
  const app = useTldrawApp()

  const intl = useIntl()
  const [openDialog, setOpenDialog] = React.useState(false)
  const settings = app.useStore(settingsSelector)

  const numberOfSelectedIds = app.useStore(numberOfSelectedIdsSelector)

  const disableAssets = app.useStore(disableAssetsSelector)

  const [_, setForce] = React.useState(0)

  React.useEffect(() => setForce(1), [])

  const {onNewProject, onOpenProject, onSaveProject, onSaveProjectAs} = useFileSystemHandlers()

  const handleSaveProjectAs = React.useCallback(() => {
    if (!supported) {
      setOpenDialog(true)
    } else {
      app.saveProjectAs()
    }
  }, [app])

  const handleDelete = React.useCallback(() => {
    app.delete()
  }, [app])

  const handleCopySVG = React.useCallback(() => {
    app.copyImage(TDExportType.SVG, {scale: 1, quality: 1, transparentBackground: false})
  }, [app])

  const handleCopyPNG = React.useCallback(() => {
    app.copyImage(TDExportType.PNG, {scale: 2, quality: 1, transparentBackground: true})
  }, [app])

  const handleExportPNG = React.useCallback(async () => {
    app.exportImage(TDExportType.PNG, {scale: 2, quality: 1})
  }, [app])

  const handleExportJPG = React.useCallback(async () => {
    app.exportImage(TDExportType.JPG, {scale: 2, quality: 1})
  }, [app])

  const handleExportWEBP = React.useCallback(async () => {
    app.exportImage(TDExportType.WEBP, {scale: 2, quality: 1})
  }, [app])

  const handleExportSVG = React.useCallback(async () => {
    app.exportImage(TDExportType.SVG, {scale: 2, quality: 1})
  }, [app])

  const handleCopyJSON = React.useCallback(async () => {
    app.copyJson()
  }, [app])

  const handleExportJSON = React.useCallback(async () => {
    app.exportJson()
  }, [app])

  const handleCut = React.useCallback(() => {
    app.cut()
  }, [app])

  const handleCopy = React.useCallback(() => {
    app.copy()
  }, [app])

  const handlePaste = React.useCallback(() => {
    app.paste()
  }, [app])

  const handleSelectAll = React.useCallback(() => {
    app.selectAll()
  }, [app])

  const handleSelectNone = React.useCallback(() => {
    app.selectNone()
  }, [app])

  const handleUploadMedia = React.useCallback(() => {
    app.openAsset()
  }, [app])

  const showViewzones = React.useCallback(() => {
    app.setSetting('isViewzoneMode', (v) => !v)
  }, [app])

  const handleZoomTo100 = React.useCallback(() => {
    app.zoomTo(1)
  }, [app])

  const showFileMenu =
    app.callbacks.onNewProject ||
    app.callbacks.onOpenProject ||
    app.callbacks.onSaveProject ||
    app.callbacks.onSaveProjectAs ||
    app.callbacks.onExport

  const hasSelection = numberOfSelectedIds > 0

  const openInbox = app.useStore(openInboxSelector)

  const [inbox, setInbox] = React.useState([{
    id: 0,
    title: ''
  }]);

  React.useEffect(() => {
    EdubreakService.getInbox().then((items) => {
      if (items.length > 0) {
        app.setSetting('openInbox', true)
        setInbox(items)
      }
    })
  }, [])

  const handleMenuOpenChange = React.useCallback(
    (open: boolean) => {
      app.setMenuOpen(open)
    },
    [app]
  )

  const dragStart = (e: any, campusURL: string, type: string) => {
    console.log('target: ', e.target);
    const parsedLink = EdubreakService.parseEdubreakLink(campusURL.replace('node', type))
    console.log('parsed Link: ', parsedLink);
    e.dataTransfer.setData("text/plain", JSON.stringify(parsedLink));
  }

  return (
    <>
      <DropdownMenu.Root dir="ltr"
                         open={openInbox}
                         onOpenChange={handleMenuOpenChange}
                         modal={false}
      >
        <DMTriggerIcon id="TD-InboxMenuIcon"
                       onClick={() => {
                         app.setSetting('openInbox', !openInbox)
                       }}>
          {openInbox ?
            <EnvelopeOpenIcon
              onPointerDown={stopPropagation}/> :
            <EnvelopeClosedIcon
              onPointerDown={stopPropagation}/>
          }
        </DMTriggerIcon>
        <DMContent
          variant="menu"
          id="TD-InboxMenu"
          side="bottom"
          align="end"
          sideOffset={4}
          alignOffset={4}
        >
          <StyledRow>
            <span>
              <FormattedMessage id="inbox.title"/>
            </span>
          </StyledRow>
          <Divider/>
          {inbox.map((artefact: any, i: number) => (
            <StyledRow id={'Edubreak-Artefact-' + artefact.id} key={i} draggable
                       onDragStart={(e) => dragStart(e, artefact.campusURL, artefact.type)}>
              <div>{artefact.title}</div>
            </StyledRow>
          ))}
        </DMContent>
      </DropdownMenu.Root>
    </>
  )
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
