import { Menu, MenuItemConstructorOptions, shell } from 'electron'
import type { Message } from 'src/types'

export async function createMenu(send: (message: Message) => Promise<void>) {
  const isMac = process.platform === 'darwin'

  const template: MenuItemConstructorOptions[] = []

  // About Menu (mac only)
  if (isMac) {
    template.push({
      label: 'Hello world!',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    })
  }

  // File Menu
  template.push({
    label: 'File',
    submenu: [
      { label: 'New Project', click: () => send({ type: 'undo' }) },
      { type: 'separator' },
      { label: 'Open...', click: () => send({ type: 'redo' }) },
      { type: 'separator' },
      { label: 'Save', click: () => send({ type: 'redo' }) },
      { label: 'Save As...', click: () => send({ type: 'redo' }) },
      { type: 'separator' },
      { role: 'quit' },
    ],
  })

  // Edit Menu
  template.push({
    label: 'Edit',
    submenu: [
      { label: 'Undo', click: () => send({ type: 'undo' }), accelerator: 'CmdOrCtrl+Z' },
      { label: 'Redo', click: () => send({ type: 'redo' }), accelerator: 'CmdOrCtrl+Shift+Z' },
      { type: 'separator' },
      { label: 'Cut', click: () => send({ type: 'cut' }), accelerator: 'CmdOrCtrl+X' },
      { label: 'Copy', click: () => send({ type: 'copy' }), accelerator: 'CmdOrCtrl+C' },
      { label: 'Paste', click: () => send({ type: 'paste' }), accelerator: 'CmdOrCtrl+V' },
      { label: 'Delete', click: () => send({ type: 'delete' }), accelerator: 'Delete' },
      { label: 'Select All', click: () => send({ type: 'selectAll' }), accelerator: 'CmdOrCtrl+A' },
      { label: 'Select None', click: () => send({ type: 'selectNone' }) },
    ],
  })

  // View Menu
  template.push({
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      {
        label: 'Actual Size',
        click: () => send({ type: 'resetZoom' }),
      },
      { label: 'Zoom In', click: () => send({ type: 'zoomIn' }) },
      { label: 'Zoom Out', click: () => send({ type: 'zoomOut' }) },
      { label: 'Zoom to Fit', click: () => send({ type: 'zoomToFit' }) },
      { label: 'Zoom to Selection', click: () => send({ type: 'zoomToSelection' }) },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  })

  // Window Menu
  if (isMac) {
    template.push({
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
        { type: 'separator' },
        { role: 'window' },
      ],
    })
  } else {
    template.push({
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'close' }],
    })
  }

  template.push({
    role: 'help',
    submenu: [
      {
        label: 'Learn More',
        click: async () => {
          await shell.openExternal('https://electronjs.org')
        },
      },
    ],
  })

  const menu = Menu.buildFromTemplate(template)

  Menu.setApplicationMenu(menu)
}
