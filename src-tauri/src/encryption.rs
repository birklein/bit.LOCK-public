use std::path::PathBuf;
use tauri::Manager;

/// Resolve the qpdf binary path next to our own executable
fn qpdf_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .resource_dir()
        .map_err(|e| e.to_string())?;

    let binary = if cfg!(target_os = "windows") {
        "qpdf.exe"
    } else {
        "qpdf"
    };

    // In dev mode the sidecar lands next to the app binary in target/debug/
    // In production it lands in the resource dir
    let candidates = [
        dir.join(binary),
        std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|d| d.join(binary)))
            .unwrap_or_default(),
    ];

    for path in &candidates {
        if path.exists() {
            return Ok(path.clone());
        }
    }

    Err(format!("qpdf nicht gefunden. Gesucht in: {:?}", candidates))
}

#[tauri::command]
pub async fn encrypt_pdf(
    app: tauri::AppHandle,
    input_path: String,
    output_path: String,
    password: String,
) -> Result<(), String> {
    // Input validation: Pfade muessen existieren und duerfen keine Path-Traversal enthalten
    let input = std::path::Path::new(&input_path);
    if !input.exists() {
        return Err("Eingabedatei existiert nicht".to_string());
    }
    if !input_path.to_lowercase().ends_with(".pdf") {
        return Err("Nur PDF-Dateien erlaubt".to_string());
    }
    if password.is_empty() || password.len() > 500 {
        return Err("Passwort ungueltig (leer oder zu lang)".to_string());
    }

    let qpdf = qpdf_path(&app)?;

    let output = std::process::Command::new(&qpdf)
        .args([
            "--encrypt",
            &password,
            &password,
            "256",
            "--",
            &input_path,
            &output_path,
        ])
        .output()
        .map_err(|e| format!("qpdf starten fehlgeschlagen: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(format!("qpdf-Fehler: {}", stderr))
    }
}

#[tauri::command]
pub async fn select_pdf(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let path = app
        .dialog()
        .file()
        .set_title("PDF auswaehlen")
        .add_filter("PDF-Dateien", &["pdf"])
        .blocking_pick_file();

    match path {
        Some(fp) => {
            let pb = fp.into_path().map_err(|e| e.to_string())?;
            Ok(Some(pb.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub async fn select_save_path(
    app: tauri::AppHandle,
    original_name: String,
) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;

    let base_name = original_name.trim_end_matches(".pdf").trim_end_matches(".PDF");
    let default_name = format!("{}_verschluesselt.pdf", base_name);

    let path = app
        .dialog()
        .file()
        .set_title("Verschluesselte PDF speichern")
        .set_file_name(&default_name)
        .add_filter("PDF-Dateien", &["pdf"])
        .blocking_save_file();

    match path {
        Some(fp) => {
            let pb = fp.into_path().map_err(|e| e.to_string())?;
            Ok(Some(pb.to_string_lossy().to_string()))
        }
        None => Ok(None),
    }
}
