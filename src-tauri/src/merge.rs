use serde::{Deserialize, Serialize};
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MergeResult {
    pub output_path: String,
    pub page_count: u32,
    pub file_size: u64,
}

/// Resolve qpdf binary path (reuse from encryption module logic)
fn qpdf_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().resource_dir().map_err(|e| e.to_string())?;
    let binary = if cfg!(target_os = "windows") { "qpdf.exe" } else { "qpdf" };
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
    Err(format!("qpdf nicht gefunden: {:?}", candidates))
}

#[tauri::command]
pub async fn merge_pdfs(
    app: tauri::AppHandle,
    input_paths: Vec<String>,
    output_path: String,
) -> Result<MergeResult, String> {
    if input_paths.len() < 2 {
        return Err("Mindestens 2 PDF-Dateien erforderlich".into());
    }

    // Validate all inputs exist
    for path in &input_paths {
        if !std::path::Path::new(path).exists() {
            return Err(format!("Datei nicht gefunden: {}", path));
        }
    }

    let qpdf = qpdf_path(&app)?;

    // qpdf --empty --pages file1.pdf file2.pdf ... -- output.pdf
    let mut args: Vec<&str> = vec!["--empty", "--pages"];
    for path in &input_paths {
        args.push(path);
    }
    args.push("--");
    args.push(&output_path);

    let output = std::process::Command::new(&qpdf)
        .args(&args)
        .output()
        .map_err(|e| format!("qpdf starten fehlgeschlagen: {e}"))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("Zusammenführen fehlgeschlagen: {stderr}"));
    }

    let file_size = std::fs::metadata(&output_path)
        .map_err(|e| e.to_string())?
        .len();

    // Count pages via qpdf
    let page_output = std::process::Command::new(&qpdf)
        .args(["--show-npages", &output_path])
        .output()
        .ok();
    let page_count = page_output
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| s.trim().parse::<u32>().ok())
        .unwrap_or(0);

    Ok(MergeResult {
        output_path,
        page_count,
        file_size,
    })
}

#[tauri::command]
pub async fn select_multiple_pdfs(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let paths = app
        .dialog()
        .file()
        .set_title("PDF-Dateien auswählen")
        .add_filter("PDF-Dateien", &["pdf"])
        .blocking_pick_files();

    match paths {
        Some(files) => {
            let result: Vec<String> = files
                .iter()
                .filter_map(|fp| fp.clone().into_path().ok())
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            Ok(result)
        }
        None => Ok(vec![]),
    }
}

#[tauri::command]
pub async fn select_merge_save_path(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let path = app
        .dialog()
        .file()
        .set_title("Zusammengeführtes PDF speichern")
        .set_file_name("zusammengefuehrt.pdf")
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

#[tauri::command]
pub fn print_pdf(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-a", "Preview", &file_path])
            .spawn()
            .map_err(|e| format!("Drucken fehlgeschlagen: {e}"))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", "/print", &file_path])
            .spawn()
            .map_err(|e| format!("Drucken fehlgeschlagen: {e}"))?;
    }
    Ok(())
}
