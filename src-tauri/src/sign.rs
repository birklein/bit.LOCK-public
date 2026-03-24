use crate::crypto;
use crate::database::MachineKey;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::Mutex;
use tauri::{Manager, State};

// ── Types ──────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SignSession {
    pub email: String,
    pub name: String,
    pub tenant_id: String,
    pub tenant_slug: String,
    pub role: String,
    pub access_token: String,
    pub refresh_token: String,
    pub api_url: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SignSessionInfo {
    pub email: String,
    pub name: String,
    pub tenant_slug: String,
    pub role: String,
    pub api_url: String,
    pub connected: bool,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SignResult {
    pub signed_path: String,
    pub document_id: String,
    pub timestamp: String,
}

// ── Session persistence (encrypted in SQLite) ──────────────────────

fn save_session(conn: &Connection, key: &[u8; 32], session: &SignSession) -> Result<(), String> {
    let json = serde_json::to_string(session).map_err(|e| e.to_string())?;
    let encrypted = crypto::encrypt_password(&json, key)?;
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('bitsign_session', ?1)
         ON CONFLICT(key) DO UPDATE SET value = ?1",
        params![encrypted],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

fn load_session(conn: &Connection, key: &[u8; 32]) -> Option<SignSession> {
    let encrypted: String = conn
        .prepare("SELECT value FROM settings WHERE key = 'bitsign_session'")
        .ok()?.query_row([], |row| row.get(0)).ok()?;
    let json = crypto::decrypt_password(&encrypted, key).ok()?;
    serde_json::from_str(&json).ok()
}

fn delete_session(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM settings WHERE key = 'bitsign_session'", [])
        .map_err(|e| e.to_string())?;
    Ok(())
}

fn save_enabled(conn: &Connection, enabled: bool) -> Result<(), String> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES ('bitsign_enabled', ?1)
         ON CONFLICT(key) DO UPDATE SET value = ?1",
        params![if enabled { "true" } else { "false" }],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

fn is_enabled(conn: &Connection) -> bool {
    conn.prepare("SELECT value FROM settings WHERE key = 'bitsign_enabled'")
        .ok()
        .and_then(|mut s| s.query_row([], |row| row.get::<_, String>(0)).ok())
        .map(|v| v == "true")
        .unwrap_or(false)
}

// ── OAuth2 PKCE ────────────────────────────────────────────────────

fn generate_pkce() -> (String, String) {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let verifier: String = (0..64)
        .map(|_| {
            let idx = rng.gen_range(0..62);
            b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[idx] as char
        })
        .collect();
    let challenge = {
        let hash = Sha256::digest(verifier.as_bytes());
        base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            hash,
        )
    };
    (verifier, challenge)
}

/// Start local HTTP server, open browser for OAuth2 PKCE, wait for callback
async fn oauth2_pkce_flow(api_url: &str) -> Result<(String, String), String> {
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let (verifier, challenge) = generate_pkce();

    // Fixed port required for OAuth2 redirect_uri matching in bit.SIGN
    const CALLBACK_PORT: u16 = 13579;
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", CALLBACK_PORT))
        .await
        .map_err(|e| format!("Callback-Server starten fehlgeschlagen: {e}"))?;
    let redirect_uri = format!("http://localhost:{}/callback", CALLBACK_PORT);

    // bit.SIGN OAuth2 authorize endpoint
    let auth_url = format!(
        "{}/api/auth/oauth2/authorize?client_id=bit-lock&redirect_uri={}&response_type=code&code_challenge={}&code_challenge_method=S256&scope=documents:read%20documents:write%20documents:sign",
        api_url,
        urlencoding(&redirect_uri),
        challenge,
    );
    open::that(&auth_url).map_err(|e| format!("Browser öffnen fehlgeschlagen: {e}"))?;

    // Wait for callback (max 120s)
    let accept = tokio::time::timeout(
        std::time::Duration::from_secs(120),
        listener.accept(),
    ).await
        .map_err(|_| "Anmeldung abgelaufen (120s Timeout)")?
        .map_err(|e| format!("Callback empfangen fehlgeschlagen: {e}"))?;

    let mut stream = accept.0;
    let mut buf = vec![0u8; 4096];
    let n = stream.read(&mut buf).await.map_err(|e| e.to_string())?;
    let request = String::from_utf8_lossy(&buf[..n]);

    // Parse code from GET /callback?code=...
    let code = request
        .lines()
        .next()
        .and_then(|line| line.split_whitespace().nth(1))
        .and_then(|path| {
            path.split('?')
                .nth(1)?
                .split('&')
                .find(|p| p.starts_with("code="))
                .map(|p| p[5..].to_string())
        })
        .ok_or("Kein Auth-Code im Callback erhalten")?;

    // Success page
    let html = "<html><body style='font-family:system-ui;text-align:center;padding:60px'><h2>Anmeldung erfolgreich</h2><p>Sie können dieses Fenster schließen und zurück zu bit.LOCK wechseln.</p></body></html>";
    let response = format!(
        "HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        html.len(), html
    );
    stream.write_all(response.as_bytes()).await.ok();

    Ok((code, verifier))
}

/// Exchange auth code for tokens — POST /api/auth/oauth2/token
async fn exchange_code(api_url: &str, code: &str, verifier: &str) -> Result<(String, String), String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/auth/oauth2/token", api_url))
        .form(&[
            ("grant_type", "authorization_code"),
            ("code", code),
            ("code_verifier", verifier),
            ("client_id", "bit-lock"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token-Austausch fehlgeschlagen: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Anmeldung fehlgeschlagen: {body}"));
    }

    // Response: { access_token, token_type, expires_in, refresh_token, scope }
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let access_token = data["access_token"].as_str().unwrap_or("").to_string();
    let refresh_token = data["refresh_token"].as_str().unwrap_or("").to_string();

    if access_token.is_empty() {
        return Err("Kein access_token in Antwort".into());
    }

    Ok((access_token, refresh_token))
}

/// Fetch user info — GET /api/auth/oauth2/userinfo
async fn fetch_userinfo(api_url: &str, access_token: &str) -> Result<(String, String, String, String, String), String> {
    let client = reqwest::Client::new();
    let resp = client
        .get(format!("{}/api/auth/oauth2/userinfo", api_url))
        .header("Authorization", format!("Bearer {}", access_token))
        .send()
        .await
        .map_err(|e| format!("UserInfo abrufen fehlgeschlagen: {e}"))?;

    if !resp.status().is_success() {
        return Err("UserInfo nicht verfügbar".into());
    }

    // Response: { sub, name, email, tenantId, tenantSlug, role, authMethod }
    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok((
        data["email"].as_str().unwrap_or("").to_string(),
        data["name"].as_str().unwrap_or("").to_string(),
        data["tenantId"].as_str().unwrap_or("").to_string(),
        data["tenantSlug"].as_str().unwrap_or("").to_string(),
        data["role"].as_str().unwrap_or("").to_string(),
    ))
}

/// Refresh access token — POST /api/auth/oauth2/token
async fn do_refresh_token(api_url: &str, refresh_token: &str) -> Result<(String, String), String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(format!("{}/api/auth/oauth2/token", api_url))
        .form(&[
            ("grant_type", "refresh_token"),
            ("refresh_token", refresh_token),
            ("client_id", "bit-lock"),
        ])
        .send()
        .await
        .map_err(|e| format!("Token-Refresh fehlgeschlagen: {e}"))?;

    if !resp.status().is_success() {
        return Err("Session abgelaufen — bitte erneut anmelden".into());
    }

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    Ok((
        data["access_token"].as_str().unwrap_or("").to_string(),
        data["refresh_token"].as_str().unwrap_or("").to_string(),
    ))
}

/// Make authenticated API request with auto-refresh on 401
async fn api_request(
    db: &Mutex<Connection>,
    machine_key: &[u8; 32],
    method: &str,
    path: &str,
    body: Option<serde_json::Value>,
) -> Result<(reqwest::Response, SignSession), String> {
    let session = {
        let conn = db.lock().map_err(|e| e.to_string())?;
        load_session(&conn, machine_key).ok_or("Nicht bei bit.SIGN angemeldet")?
    };

    let client = reqwest::Client::new();
    let url = format!("{}{}", session.api_url, path);

    let resp = send_request(&client, method, &url, &session.access_token, body.as_ref()).await?;

    // Auto-refresh on 401
    if resp.status().as_u16() == 401 {
        let (new_access, new_refresh) =
            do_refresh_token(&session.api_url, &session.refresh_token).await?;

        let new_session = SignSession {
            access_token: new_access.clone(),
            refresh_token: if new_refresh.is_empty() {
                session.refresh_token.clone()
            } else {
                new_refresh
            },
            ..session.clone()
        };
        {
            let conn = db.lock().map_err(|e| e.to_string())?;
            save_session(&conn, machine_key, &new_session)?;
        }

        let resp2 = send_request(&client, method, &url, &new_access, body.as_ref()).await?;
        return Ok((resp2, new_session));
    }

    Ok((resp, session))
}

async fn send_request(
    client: &reqwest::Client,
    method: &str,
    url: &str,
    token: &str,
    body: Option<&serde_json::Value>,
) -> Result<reqwest::Response, String> {
    let mut req = match method {
        "POST" => client.post(url),
        _ => client.get(url),
    };
    req = req.header("Authorization", format!("Bearer {}", token));
    if let Some(b) = body {
        req = req.json(b);
    }
    req.send().await.map_err(|e| e.to_string())
}

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

// ── Tauri Commands ─────────────────────────────────────────────────

#[tauri::command]
pub fn bitsign_status(
    db: State<'_, Mutex<Connection>>,
    machine_key: State<'_, MachineKey>,
) -> Result<Option<SignSessionInfo>, String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    if !is_enabled(&conn) {
        return Ok(None);
    }
    Ok(load_session(&conn, &machine_key.0).map(|s| SignSessionInfo {
        email: s.email,
        name: s.name,
        tenant_slug: s.tenant_slug,
        role: s.role,
        api_url: s.api_url,
        connected: true,
    }))
}

#[tauri::command]
pub fn bitsign_set_enabled(
    db: State<'_, Mutex<Connection>>,
    enabled: bool,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    save_enabled(&conn, enabled)
}

/// OAuth2 PKCE login — opens browser, waits for callback, exchanges code, fetches userinfo
#[tauri::command]
pub async fn bitsign_login(
    db: State<'_, Mutex<Connection>>,
    machine_key: State<'_, MachineKey>,
    api_url: String,
) -> Result<SignSessionInfo, String> {
    // 1. PKCE flow: browser → callback → auth code
    let (code, verifier) = oauth2_pkce_flow(&api_url).await?;

    // 2. Exchange code for tokens
    let (access_token, refresh_token) = exchange_code(&api_url, &code, &verifier).await?;

    // 3. Fetch user info
    let (email, name, tenant_id, tenant_slug, role) =
        fetch_userinfo(&api_url, &access_token).await?;

    // 4. Store session encrypted
    let session = SignSession {
        email: email.clone(),
        name: name.clone(),
        tenant_id,
        tenant_slug: tenant_slug.clone(),
        role: role.clone(),
        access_token,
        refresh_token,
        api_url: api_url.clone(),
    };
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        save_session(&conn, &machine_key.0, &session)?;
        save_enabled(&conn, true)?;
    }

    Ok(SignSessionInfo {
        email,
        name,
        tenant_slug,
        role,
        api_url,
        connected: true,
    })
}

#[tauri::command]
pub fn bitsign_logout(
    db: State<'_, Mutex<Connection>>,
) -> Result<(), String> {
    let conn = db.lock().map_err(|e| e.to_string())?;
    delete_session(&conn)
}

/// Sign a PDF — computes hash locally, sends only hash to bit.SIGN
#[tauri::command]
pub async fn bitsign_sign_pdf(
    app: tauri::AppHandle,
    db: State<'_, Mutex<Connection>>,
    machine_key: State<'_, MachineKey>,
    input_path: String,
    reason: String,
) -> Result<SignResult, String> {
    // 1. Read PDF and compute hash locally
    let pdf_bytes = std::fs::read(&input_path)
        .map_err(|e| format!("PDF lesen fehlgeschlagen: {e}"))?;
    let file_name = std::path::Path::new(&input_path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("dokument.pdf");
    let hash = hex::encode(Sha256::digest(&pdf_bytes));

    // 2. Create signing request (only hash + metadata, NEVER the PDF)
    let (resp, _session) = api_request(
        &db,
        &machine_key.0,
        "POST",
        "/api/v1/documents",
        Some(serde_json::json!({
            "name": file_name,
            "source": "bit.LOCK",
            "hash": hash,
            "hashAlgorithm": "SHA-256",
            "reason": reason,
        })),
    ).await?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("Signatur-Anfrage fehlgeschlagen: {body}"));
    }

    let data: serde_json::Value = resp.json().await.map_err(|e| e.to_string())?;
    let document_id = data["id"].as_str().unwrap_or("unknown").to_string();

    // 3. Try to download signed PDF (if immediately available)
    let signed_bytes = {
        let (dl_resp, _) = api_request(
            &db,
            &machine_key.0,
            "GET",
            &format!("/api/v1/documents/{}/signed-pdf", document_id),
            None,
        ).await?;

        if dl_resp.status().is_success() {
            dl_resp.bytes().await.map(|b| b.to_vec()).unwrap_or(pdf_bytes.clone())
        } else {
            pdf_bytes.clone()
        }
    };

    // 4. Save to signed folder (read-only)
    let signed_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("signed");
    std::fs::create_dir_all(&signed_dir).map_err(|e| e.to_string())?;

    let base_name = std::path::Path::new(file_name)
        .file_stem().and_then(|s| s.to_str()).unwrap_or("dokument");
    let ts = chrono::Utc::now().format("%Y%m%d_%H%M%S");
    let signed_path = signed_dir.join(format!("{}_{}_signiert.pdf", base_name, ts));

    std::fs::write(&signed_path, &signed_bytes).map_err(|e| e.to_string())?;

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&signed_path, std::fs::Permissions::from_mode(0o444)).ok();
    }
    #[cfg(windows)]
    {
        let mut p = std::fs::metadata(&signed_path).map_err(|e| e.to_string())?.permissions();
        p.set_readonly(true);
        std::fs::set_permissions(&signed_path, p).ok();
    }

    Ok(SignResult {
        signed_path: signed_path.to_string_lossy().to_string(),
        document_id,
        timestamp: chrono::Utc::now().to_rfc3339(),
    })
}
