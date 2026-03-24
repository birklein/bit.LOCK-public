import { execFile, exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { shell } from 'electron'

const execFileAsync = promisify(execFile)

/**
 * Öffnet Outlook mit einer neuen E-Mail und hängt die verschlüsselte PDF an.
 * Windows: PowerShell + Outlook COM-Objekt
 * macOS: mailto:-Link (Anhang via Klipboard-Hinweis)
 */
export async function openOutlookPdfMail({ recipient, filePath, fileName }) {
  if (process.platform === 'win32') {
    await openOutlookWithAttachmentWindows({ recipient, filePath, fileName, isPasswordMail: false })
  } else {
    // macOS: mailto öffnet Standard-Mail-Client, Anhang nicht möglich über URL
    // Nutzer wird instruiert, die Datei manuell anzuhängen
    const subject = encodeURIComponent(`Verschlüsseltes Dokument: ${fileName}`)
    const body = encodeURIComponent(
      `Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie das verschlüsselte Dokument "${fileName}".\n\nDas Passwort erhalten Sie in einer separaten E-Mail.\n\nMit freundlichen Grüßen`
    )
    const mailto = `mailto:${recipient}?subject=${subject}&body=${body}`
    await shell.openExternal(mailto)
  }
}

/**
 * Öffnet Outlook mit einer E-Mail die nur das Passwort enthält (kein Anhang)
 */
export async function openOutlookPasswordMail({ recipient, password, fileName }) {
  const subject = encodeURIComponent(`Passwort für: ${fileName}`)
  const body = encodeURIComponent(
    `Sehr geehrte Damen und Herren,\n\ndas Passwort für das verschlüsselte Dokument "${fileName}" lautet:\n\n${password}\n\nBitte geben Sie dieses Passwort nicht weiter.\n\nMit freundlichen Grüßen`
  )
  const mailto = `mailto:${recipient}?subject=${subject}&body=${body}`
  await shell.openExternal(mailto)
}

/**
 * Windows: Outlook via PowerShell COM-Objekt öffnen mit Anhang
 * BSI S-01: execFile mit Script-Datei, KEINE Shell-Interpolation
 */
async function openOutlookWithAttachmentWindows({ recipient, filePath, fileName, isPasswordMail }) {
  // PowerShell-Script in Temp-Datei schreiben (verhindert Shell-Injection)
  const subject = isPasswordMail
    ? `Passwort fuer: ${sanitizeForPS(fileName)}`
    : `Verschluesseltes Dokument: ${sanitizeForPS(fileName)}`

  const body = isPasswordMail
    ? `Sehr geehrte Damen und Herren,\\n\\ndas Passwort erhalten Sie separat.\\n\\nMit freundlichen Grüßen`
    : `Sehr geehrte Damen und Herren,\\n\\nanbei erhalten Sie das verschluesselte Dokument.\\n\\nDas Passwort erhalten Sie in einer separaten E-Mail.\\n\\nMit freundlichen Grüßen`

  const psScript = `
$ErrorActionPreference = "Stop"
try {
  $outlook = New-Object -ComObject Outlook.Application
  $mail = $outlook.CreateItem(0)
  $mail.To = "${sanitizeForPS(recipient)}"
  $mail.Subject = "${subject}"
  $mail.Body = "${body}"
  $mail.Attachments.Add("${sanitizeForPS(filePath)}")
  $mail.Display($true)
} catch {
  Write-Error $_.Exception.Message
  exit 1
}
`

  const scriptPath = join(tmpdir(), `bitlock_${Date.now()}.ps1`)

  try {
    await writeFile(scriptPath, psScript, 'utf8')
    // BSI S-01: execFile mit -File Parameter, kein -Command mit Interpolation
    await execFileAsync('powershell', [
      '-NonInteractive',
      '-ExecutionPolicy', 'Bypass',
      '-File', scriptPath,
    ], { timeout: 15000, shell: false })
  } finally {
    // Temp-Script immer löschen
    unlink(scriptPath).catch(() => {})
  }
}

/**
 * Bereinigt einen String für sichere PowerShell-Nutzung
 * Entfernt/escaped Sonderzeichen die PS-Injection ermöglichen könnten
 */
function sanitizeForPS(input) {
  if (!input) return ''
  return input
    .replace(/"/g, '') // Anführungszeichen entfernen
    .replace(/`/g, '') // Backtick entfernen
    .replace(/\$/g, '') // Dollar entfernen
    .replace(/;/g, '') // Semikolon entfernen
    .slice(0, 500)     // Maximallänge (BSI S-07)
}
