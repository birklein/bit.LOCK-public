import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { encryptPdf } from './encryption.js'
import { initDatabase, saveToHistory, getHistory, deleteFromHistory } from './database.js'
import { openOutlookPdfMail, openOutlookPasswordMail } from './outlook.js'

let mainWindow

function createWindow() {
  const isDev = !app.isPackaged
  mainWindow = new BrowserWindow({
    width: 900,
    height: 660,
    minWidth: 800,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#FFFBF5',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: join(__dirname, '../../resources/icon.png'),
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  if (isDev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// IPC: PDF-Datei auswählen
ipcMain.handle('select-pdf', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'PDF auswählen',
    filters: [{ name: 'PDF-Dateien', extensions: ['pdf'] }],
    properties: ['openFile'],
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]
})

// IPC: Speicherort für verschlüsseltes PDF
ipcMain.handle('select-save-path', async (_, originalName) => {
  const baseName = originalName.replace(/\.pdf$/i, '')
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Verschlüsselte PDF speichern',
    defaultPath: `${baseName}_verschluesselt.pdf`,
    filters: [{ name: 'PDF-Dateien', extensions: ['pdf'] }],
  })
  if (result.canceled) return null
  return result.filePath
})

// IPC: PDF verschlüsseln
ipcMain.handle('encrypt-pdf', async (_, { inputPath, outputPath, password }) => {
  try {
    await encryptPdf(inputPath, outputPath, password)
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// IPC: Outlook-Mail mit Anhang öffnen
ipcMain.handle('open-pdf-mail', async (_, { recipient, filePath, fileName }) => {
  try {
    await openOutlookPdfMail({ recipient, filePath, fileName })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// IPC: Outlook-Mail mit Passwort öffnen
ipcMain.handle('open-password-mail', async (_, { recipient, password, fileName }) => {
  try {
    await openOutlookPasswordMail({ recipient, password, fileName })
    return { success: true }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// IPC: Historie
ipcMain.handle('save-history', async (_, entry) => {
  saveToHistory(entry)
  return { success: true }
})

ipcMain.handle('get-history', async () => {
  return getHistory()
})

ipcMain.handle('delete-history', async (_, id) => {
  deleteFromHistory(id)
  return { success: true }
})

// IPC: Fenster-Steuerung
ipcMain.on('window-minimize', () => mainWindow.minimize())
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.on('window-close', () => mainWindow.close())

// IPC: Datei im Explorer/Finder öffnen
ipcMain.handle('show-in-folder', async (_, filePath) => {
  shell.showItemInFolder(filePath)
})
