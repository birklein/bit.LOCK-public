/// Sanitise a string for safe use in PowerShell scripts
fn sanitize_for_ps(input: &str) -> String {
    input
        .replace('\\', "")
        .replace('"', "")
        .replace('`', "")
        .replace('$', "")
        .replace(';', "")
        .replace('|', "")
        .replace('&', "")
        .replace('\'', "")
        .chars()
        .take(500)
        .collect()
}

/// Percent-encode a UTF-8 string for use in mailto: URIs
fn urlencoding(s: &str) -> String {
    s.as_bytes()
        .iter()
        .map(|&b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                String::from(b as char)
            }
            _ => format!("%{:02X}", b),
        })
        .collect()
}

#[tauri::command]
pub fn open_pdf_mail(recipient: String, _file_path: String, file_name: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        return open_outlook_with_attachment_windows(&recipient, &_file_path, &file_name);
    }
    #[cfg(not(target_os = "windows"))]
    {
        let subject = urlencoding(&format!("Verschlüsseltes Dokument: {}", file_name));
        let body = urlencoding(&format!(
            "Sehr geehrte Damen und Herren,\n\nanbei erhalten Sie das verschlüsselte Dokument \"{}\".\n\nDas Passwort erhalten Sie in einer separaten E-Mail.\n\nMit freundlichen Grüßen",
            file_name
        ));
        let mailto = format!("mailto:{}?subject={}&body={}", recipient, subject, body);
        open::that(&mailto).map_err(|e| e.to_string())
    }
}

#[tauri::command]
pub fn open_password_mail(
    recipient: String,
    password: String,
    file_name: String,
) -> Result<(), String> {
    let subject = urlencoding(&format!("Passwort für: {}", file_name));
    let body = urlencoding(&format!(
        "Sehr geehrte Damen und Herren,\n\ndas Passwort für das verschlüsselte Dokument \"{}\" lautet:\n\n{}\n\nBitte geben Sie dieses Passwort nicht weiter.\n\nMit freundlichen Grüßen",
        file_name, password
    ));
    let mailto = format!("mailto:{}?subject={}&body={}", recipient, subject, body);
    open::that(&mailto).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("URL öffnen fehlgeschlagen: {e}"))
}

#[tauri::command]
pub fn show_in_folder(file_path: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .args(["-R", &file_path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .args(["/select,", &file_path])
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(target_os = "windows")]
fn open_outlook_with_attachment_windows(
    recipient: &str,
    file_path: &str,
    file_name: &str,
) -> Result<(), String> {
    let subject = format!("Verschlüsseltes Dokument: {}", sanitize_for_ps(file_name));
    let body = "Sehr geehrte Damen und Herren,`n`nanbei erhalten Sie das verschlüsselte Dokument.`n`nDas Passwort erhalten Sie in einer separaten E-Mail.`n`nMit freundlichen Grüßen";

    let ps_script = format!(
        r#"$ErrorActionPreference = "Stop"
try {{
  $outlook = New-Object -ComObject Outlook.Application
  $mail = $outlook.CreateItem(0)
  $mail.To = "{}"
  $mail.Subject = "{}"
  $mail.Body = "{}"
  $mail.Attachments.Add("{}")
  $mail.Display($true)
}} catch {{
  Write-Error $_.Exception.Message
  exit 1
}}"#,
        sanitize_for_ps(recipient),
        subject,
        body,
        sanitize_for_ps(file_path),
    );

    let temp_dir = std::env::temp_dir();
    let script_path = temp_dir.join(format!("bitlock_{}.ps1", std::process::id()));
    std::fs::write(&script_path, &ps_script).map_err(|e| e.to_string())?;

    let result = std::process::Command::new("powershell")
        .args(["-NonInteractive", "-ExecutionPolicy", "Bypass", "-File"])
        .arg(&script_path)
        .output()
        .map_err(|e| e.to_string());

    std::fs::remove_file(&script_path).ok();

    match result {
        Ok(output) if output.status.success() => Ok(()),
        Ok(output) => Err(String::from_utf8_lossy(&output.stderr).to_string()),
        Err(e) => Err(e),
    }
}
