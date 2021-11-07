import { shell, Menu, MenuItemConstructorOptions } from 'electron'
import { fileSystemManager } from './FileSystemManager'
import { sendMessage } from './window'

export async function createMenu() {
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
      {
        label: 'New Project',
        click: () => {
          fileSystemManager.newFile()
          // Open new project dialog
        },
        accelerator: 'CmdOrCtrl+N',
      },
      { type: 'separator' },
      {
        label: 'Open...',
        click: () => {
          fileSystemManager.openFile()
          // Open open project dialog
        },
        accelerator: 'CmdOrCtrl+O',
      },
      { type: 'separator' },
      {
        label: 'Save',
        click: () => {
          fileSystemManager.saveFile()
          // Open save project dialog
        },
        accelerator: 'CmdOrCtrl+S',
      },
      {
        label: 'Save As...',
        click: () => {
          fileSystemManager.saveFileAs()
          // Open save project as dialog
        },
        accelerator: 'CmdOrCtrl+Shift+S',
      },
      { type: 'separator' },
      { role: 'quit' },
    ],
  })

  // Edit Menu
  template.push({
    label: 'Edit',
    submenu: [
      { label: 'Undo', click: () => sendMessage({ type: 'undo' }), accelerator: 'CmdOrCtrl+Z' },
      {
        label: 'Redo',
        click: () => sendMessage({ type: 'redo' }),
        accelerator: 'CmdOrCtrl+Shift+Z',
      },
      { type: 'separator' },
      { label: 'Cut', click: () => sendMessage({ type: 'cut' }), accelerator: 'CmdOrCtrl+X' },
      { label: 'Copy', click: () => sendMessage({ type: 'copy' }), accelerator: 'CmdOrCtrl+C' },
      { label: 'Paste', click: () => sendMessage({ type: 'paste' }), accelerator: 'CmdOrCtrl+V' },
      { label: 'Delete', click: () => sendMessage({ type: 'delete' }), accelerator: 'Delete' },
      {
        label: 'Select All',
        click: () => sendMessage({ type: 'selectAll' }),
        accelerator: 'CmdOrCtrl+A',
      },
      { label: 'Select None', click: () => sendMessage({ type: 'selectNone' }) },
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
        click: () => sendMessage({ type: 'resetZoom' }),
      },
      { label: 'Zoom In', click: () => sendMessage({ type: 'zoomIn' }) },
      { label: 'Zoom Out', click: () => sendMessage({ type: 'zoomOut' }) },
      { label: 'Zoom to Fit', click: () => sendMessage({ type: 'zoomToFit' }) },
      { label: 'Zoom to Selection', click: () => sendMessage({ type: 'zoomToSelection' }) },
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
