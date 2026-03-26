use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    // E-Mail
    pub pdf_mail_subject: String,
    pub pdf_mail_body: String,
    pub password_mail_subject: String,
    pub password_mail_body: String,
    pub mail_client: String, // "system" | "outlook"

    // Speicherort
    pub default_output_dir: String, // leer = immer fragen

    // Verlauf
    pub history_retention_days: i64, // 0 = nie loeschen

    // Updates
    pub auto_check_updates: bool,

    // Signing server
    pub bitsign_tenant_url: String, // signing server URL
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            pdf_mail_subject: "Verschlüsseltes Dokument: {fileName}".into(),
            pdf_mail_body: "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie das verschlüsselte Dokument \"{fileName}\".\n\nDas Passwort erhalten Sie in einer separaten Nachricht.\n\nMit freundlichen Grüßen".into(),
            password_mail_subject: "Passwort für: {fileName}".into(),
            password_mail_body: "Sehr geehrte Damen und Herren,\n\ndas Passwort für das verschlüsselte Dokument \"{fileName}\" lautet:\n\n{password}\n\nBitte geben Sie dieses Passwort nicht weiter.\n\nMit freundlichen Grüßen".into(),
            mail_client: "system".into(),
            default_output_dir: String::new(),
            history_retention_days: 0,
            auto_check_updates: true,
            bitsign_tenant_url: String::new(),
        }
    }
}

pub fn init_settings_table(conn: &Connection) -> rusqlite::Result<()> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )"
    )
}

fn get_val(conn: &Connection, key: &str) -> Option<String> {
    conn.prepare("SELECT value FROM settings WHERE key = ?1")
        .ok()?
        .query_row(params![key], |row| row.get(0))
        .ok()
}

fn set_val(conn: &Connection, key: &str, value: &str) -> rusqlite::Result<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )?;
    Ok(())
}

pub fn load_settings(conn: &Connection) -> AppSettings {
    let defaults = AppSettings::default();
    AppSettings {
        pdf_mail_subject: get_val(conn, "pdf_mail_subject").unwrap_or(defaults.pdf_mail_subject),
        pdf_mail_body: get_val(conn, "pdf_mail_body").unwrap_or(defaults.pdf_mail_body),
        password_mail_subject: get_val(conn, "password_mail_subject").unwrap_or(defaults.password_mail_subject),
        password_mail_body: get_val(conn, "password_mail_body").unwrap_or(defaults.password_mail_body),
        mail_client: get_val(conn, "mail_client").unwrap_or(defaults.mail_client),
        default_output_dir: get_val(conn, "default_output_dir").unwrap_or(defaults.default_output_dir),
        history_retention_days: get_val(conn, "history_retention_days")
            .and_then(|v| v.parse().ok())
            .unwrap_or(defaults.history_retention_days),
        auto_check_updates: get_val(conn, "auto_check_updates")
            .map(|v| v == "true")
            .unwrap_or(defaults.auto_check_updates),
        bitsign_tenant_url: get_val(conn, "bitsign_tenant_url").unwrap_or(defaults.bitsign_tenant_url),
    }
}

fn save_settings(conn: &Connection, s: &AppSettings) -> rusqlite::Result<()> {
    set_val(conn, "pdf_mail_subject", &s.pdf_mail_subject)?;
    set_val(conn, "pdf_mail_body", &s.pdf_mail_body)?;
    set_val(conn, "password_mail_subject", &s.password_mail_subject)?;
    set_val(conn, "password_mail_body", &s.password_mail_body)?;
    set_val(conn, "mail_client", &s.mail_client)?;
    set_val(conn, "default_output_dir", &s.default_output_dir)?;
    set_val(conn, "history_retention_days", &s.history_retention_days.to_string())?;
    set_val(conn, "auto_check_updates", if s.auto_check_updates { "true" } else { "false" })?;
    set_val(conn, "bitsign_tenant_url", &s.bitsign_tenant_url)?;
    Ok(())
}

#[tauri::command]
pub fn get_settings(db: State<'_, Mutex<Connection>>) -> Result<AppSettings, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    Ok(load_settings(&conn))
}

#[tauri::command]
pub fn update_settings(
    db: State<'_, Mutex<Connection>>,
    settings: AppSettings,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    save_settings(&conn, &settings).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reset_data(db: State<'_, Mutex<Connection>>) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute_batch("DELETE FROM history; DELETE FROM settings;")
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn select_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app
        .dialog()
        .file()
        .set_title("Standard-Ausgabeordner wählen")
        .blocking_pick_folder();
    match path {
        Some(fp) => {
            let pb = fp.into_path().map_err(|e| e.to_string())?;
            Ok(Some(pb.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}
