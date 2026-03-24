import { invoke } from '@tauri-apps/api/core'

export const api = {
  selectPdf: () => invoke('select_pdf'),
  selectSavePath: (originalName) => invoke('select_save_path', { originalName }),
  encryptPdf: (params) => invoke('encrypt_pdf', params),
  openPdfMail: (params) => invoke('open_pdf_mail', params),
  openPasswordMail: (params) => invoke('open_password_mail', params),
  saveHistory: (entry) => invoke('save_history', { entry }),
  getHistory: () => invoke('get_history'),
  deleteHistory: (id) => invoke('delete_history', { id }),
  showInFolder: (filePath) => invoke('show_in_folder', { filePath }),
  analyzePdf: (inputPath) => invoke('analyze_pdf', { inputPath }),
  compressPdf: (params) => invoke('compress_pdf', params),
  selectCompressSavePath: (originalName) => invoke('select_compress_save_path', { originalName }),
  // bit.SIGN
  bitsignStatus: () => invoke('bitsign_status'),
  bitsignSetEnabled: (enabled) => invoke('bitsign_set_enabled', { enabled }),
  bitsignLogin: (apiUrl) => invoke('bitsign_login', { apiUrl }),
  bitsignLogout: () => invoke('bitsign_logout'),
  bitsignSignPdf: (params) => invoke('bitsign_sign_pdf', params),
  // Settings
  getSettings: () => invoke('get_settings'),
  updateSettings: (settings) => invoke('update_settings', { settings }),
  resetData: () => invoke('reset_data'),
  selectDirectory: () => invoke('select_directory'),
}
