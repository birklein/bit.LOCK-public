import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // PDF-Operationen
  selectPdf: () => ipcRenderer.invoke('select-pdf'),
  selectSavePath: (originalName) => ipcRenderer.invoke('select-save-path', originalName),
  encryptPdf: (params) => ipcRenderer.invoke('encrypt-pdf', params),

  // Outlook
  openPdfMail: (params) => ipcRenderer.invoke('open-pdf-mail', params),
  openPasswordMail: (params) => ipcRenderer.invoke('open-password-mail', params),

  // Historie
  saveHistory: (entry) => ipcRenderer.invoke('save-history', entry),
  getHistory: () => ipcRenderer.invoke('get-history'),
  deleteHistory: (id) => ipcRenderer.invoke('delete-history', id),

  // Fenster
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

  // Explorer/Finder
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
})
