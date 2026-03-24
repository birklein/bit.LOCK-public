import { execFile } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { randomBytes } from 'crypto'

const execFileAsync = promisify(execFile)

/**
 * Findet den qpdf-Binary-Pfad (gebündelt oder System)
 */
function getQpdfPath() {
  const isWin = process.platform === 'win32'
  const binaryName = isWin ? 'qpdf.exe' : 'qpdf'

  if (app.isPackaged) {
    // Im pakettierten Build: electron-builder kopiert den richtigen Binary flach nach resources/bin/
    const bundledPath = join(process.resourcesPath, 'bin', binaryName)
    if (existsSync(bundledPath)) return bundledPath
  } else {
    // Im Dev-Modus: plattform- und architekturspezifisches Unterverzeichnis
    const subDir = isWin ? 'win' : `mac/${process.arch}`
    const devPath = join(__dirname, '../../resources/bin', subDir, binaryName)
    if (existsSync(devPath)) return devPath
  }

  // Fallback: systemweit installiertes qpdf
  return binaryName
}

/**
 * Verschlüsselt eine PDF-Datei mit AES-256 (BSI-konform, S-01 + S-08)
 * Verwendet execFile mit Argument-Array – KEIN shell: true, KEINE String-Interpolation
 *
 * @param {string} inputPath  - Pfad zur Original-PDF
 * @param {string} outputPath - Pfad zur verschlüsselten PDF
 * @param {string} password   - Passwort für die Verschlüsselung
 */
export async function encryptPdf(inputPath, outputPath, password) {
  const qpdfPath = getQpdfPath()

  // qpdf --encrypt <user-pw> <owner-pw> 256 -- <input> <output>
  // BSI S-01: execFile mit Array, KEIN Shell-String-Interpolation
  const args = [
    '--encrypt',
    password,   // User-Passwort (zum Öffnen)
    password,   // Owner-Passwort (identisch – kein Drucken/Kopieren ohne Passwort)
    '256',      // AES-256 (BSI TR-02102 konform)
    '--',
    inputPath,
    outputPath,
  ]

  await execFileAsync(qpdfPath, args, {
    timeout: 30000, // 30 Sekunden Timeout
    shell: false,   // KEIN Shell – BSI S-01
  })
}

/**
 * Generiert ein kryptografisch sicheres Passwort (BSI S-08)
 * Verwendet crypto.randomBytes – KEIN Math.random()
 *
 * @returns {string} 16-stelliges Passwort mit Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen
 */
export function generatePassword() {
  // Zeichensatz: Buchstaben + Zahlen + Sonderzeichen, gut lesbar (kein 0/O/I/l)
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&'
  const bytes = randomBytes(16)
  return Array.from(bytes).map((b) => charset[b % charset.length]).join('')
}
