import Database from 'better-sqlite3'
import { join } from 'path'
import { app } from 'electron'

let db

/**
 * Initialisiert die SQLite-Datenbank für die Passwort-Historie
 */
export function initDatabase() {
  const dbPath = join(app.getPath('userData'), 'history.db')
  db = new Database(dbPath)

  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_name TEXT NOT NULL,
      encrypted_path TEXT NOT NULL,
      recipient TEXT DEFAULT '',
      password TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `)
}

/**
 * Speichert einen Eintrag in die Historie
 * @param {{ fileName: string, encryptedPath: string, recipient: string, password: string }} entry
 */
export function saveToHistory(entry) {
  const stmt = db.prepare(
    'INSERT INTO history (file_name, encrypted_path, recipient, password, created_at) VALUES (?, ?, ?, ?, ?)'
  )
  stmt.run(
    entry.fileName,
    entry.encryptedPath,
    entry.recipient || '',
    entry.password,
    new Date().toISOString()
  )
}

/**
 * Gibt die Historie zurück (neueste zuerst)
 * @returns {Array}
 */
export function getHistory() {
  const stmt = db.prepare('SELECT * FROM history ORDER BY created_at DESC LIMIT 200')
  return stmt.all()
}

/**
 * Löscht einen Eintrag aus der Historie
 * @param {number} id
 */
export function deleteFromHistory(id) {
  const stmt = db.prepare('DELETE FROM history WHERE id = ?')
  stmt.run(id)
}
