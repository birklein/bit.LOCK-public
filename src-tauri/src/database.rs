use crate::crypto;
use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::State;

/// Machine key for password encryption, initialised once at startup
pub struct MachineKey(pub [u8; 32]);

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: Option<i64>,
    pub file_name: String,
    pub encrypted_path: String,
    pub recipient: String,
    pub password: String,
    pub created_at: Option<String>,
}

pub fn init_db(db_path: &std::path::Path) -> Result<Connection> {
    std::fs::create_dir_all(db_path.parent().unwrap()).ok();
    let conn = Connection::open(db_path)?;

    // WAL mode for better concurrent access
    conn.execute_batch("PRAGMA journal_mode=WAL")?;

    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            encrypted_path TEXT NOT NULL,
            recipient TEXT DEFAULT '',
            password_encrypted TEXT NOT NULL,
            created_at TEXT NOT NULL
        )",
    )?;

    // Migration: old schema had 'password' column, new schema expects 'password_encrypted'
    let has_old_column: bool = conn
        .prepare("SELECT COUNT(*) FROM pragma_table_info('history') WHERE name = 'password'")
        .and_then(|mut stmt| stmt.query_row([], |row| row.get::<_, i64>(0)))
        .map(|count| count > 0)
        .unwrap_or(false);

    if has_old_column {
        // Rebuild table with correct schema (SQLite has no RENAME COLUMN before 3.25)
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS history_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_name TEXT NOT NULL,
                encrypted_path TEXT NOT NULL,
                recipient TEXT DEFAULT '',
                password_encrypted TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            INSERT OR IGNORE INTO history_new (id, file_name, encrypted_path, recipient, password_encrypted, created_at)
                SELECT id, file_name, encrypted_path, recipient, password, created_at FROM history;
            DROP TABLE history;
            ALTER TABLE history_new RENAME TO history;"
        ).map_err(|e| {
            eprintln!("Migration failed: {e}");
            e
        })?;
    }

    Ok(conn)
}

#[tauri::command]
pub fn save_history(
    db: State<'_, Mutex<Connection>>,
    machine_key: State<'_, MachineKey>,
    entry: HistoryEntry,
) -> Result<(), String> {
    // Encrypt the password before storing
    let encrypted_pw = crypto::encrypt_password(&entry.password, &machine_key.0)?;

    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO history (file_name, encrypted_path, recipient, password_encrypted, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            entry.file_name,
            entry.encrypted_path,
            entry.recipient,
            encrypted_pw,
            chrono::Utc::now().to_rfc3339(),
        ],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_history(
    db: State<'_, Mutex<Connection>>,
    machine_key: State<'_, MachineKey>,
) -> Result<Vec<HistoryEntry>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT id, file_name, encrypted_path, recipient, password_encrypted, created_at FROM history ORDER BY created_at DESC LIMIT 200")
        .map_err(|e| e.to_string())?;
    let entries = stmt
        .query_map([], |row| {
            let encrypted_pw: String = row.get(4)?;
            Ok((
                row.get::<_, Option<i64>>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, String>(2)?,
                row.get::<_, String>(3)?,
                encrypted_pw,
                row.get::<_, Option<String>>(5)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|row| {
            let (id, file_name, encrypted_path, recipient, encrypted_pw, created_at) =
                row.ok()?;
            // Decrypt — if decryption fails (old plaintext data), use as-is
            let password = crypto::decrypt_password(&encrypted_pw, &machine_key.0)
                .unwrap_or(encrypted_pw);
            Some(HistoryEntry {
                id,
                file_name,
                encrypted_path,
                recipient,
                password,
                created_at,
            })
        })
        .collect();
    Ok(entries)
}

#[tauri::command]
pub fn delete_history(db: State<'_, Mutex<Connection>>, id: i64) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM history WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}
