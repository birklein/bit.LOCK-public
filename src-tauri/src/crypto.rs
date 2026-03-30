//! Passwort-Verschluesselung fuer die History-Datenbank.
//!
//! Passwoerter werden mit AES-256-GCM verschluesselt gespeichert.
//! Der Schluessel wird aus einer maschinengebundenen ID abgeleitet
//! die beim ersten Start zufaellig erzeugt und lokal gespeichert wird.
//!
//! Das schuetzt gegen: Diebstahl der history.db Datei allein.
//! Es schuetzt NICHT gegen: Vollzugriff auf die Maschine (dort liegt auch der Key).

use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::path::Path;

/// Derive a 256-bit key from the machine-bound secret
fn derive_key(machine_secret: &[u8]) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"bit.PDF-password-encryption-v1");
    hasher.update(machine_secret);
    hasher.finalize().into()
}

/// Load or create the machine-bound secret
pub fn load_or_create_machine_key(app_data_dir: &Path) -> Result<[u8; 32], String> {
    let key_path = app_data_dir.join(".machine-key");

    if key_path.exists() {
        let raw = std::fs::read(&key_path).map_err(|e| format!("Key lesen: {}", e))?;
        if raw.len() != 32 {
            return Err("Ungueltiger Machine Key".to_string());
        }
        let mut key = [0u8; 32];
        key.copy_from_slice(&raw);
        Ok(key)
    } else {
        let mut key = [0u8; 32];
        rand::thread_rng().fill_bytes(&mut key);
        std::fs::create_dir_all(app_data_dir).ok();
        std::fs::write(&key_path, &key).map_err(|e| format!("Key schreiben: {}", e))?;

        // Restrict file permissions (macOS/Linux)
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            std::fs::set_permissions(&key_path, std::fs::Permissions::from_mode(0o600)).ok();
        }

        Ok(key)
    }
}

/// Encrypt a password string → base64-encoded ciphertext (nonce prepended)
pub fn encrypt_password(password: &str, machine_key: &[u8; 32]) -> Result<String, String> {
    let key = derive_key(machine_key);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, password.as_bytes())
        .map_err(|e| format!("Verschluesselung fehlgeschlagen: {}", e))?;

    // Prepend nonce to ciphertext, then base64-encode
    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&combined))
}

/// Decrypt a base64-encoded ciphertext → password string
pub fn decrypt_password(encrypted: &str, machine_key: &[u8; 32]) -> Result<String, String> {
    let key = derive_key(machine_key);
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;

    let combined = BASE64
        .decode(encrypted)
        .map_err(|e| format!("Base64-Dekodierung: {}", e))?;

    if combined.len() < 13 {
        return Err("Verschluesselter Text zu kurz".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Entschluesselung fehlgeschlagen — Key oder Daten korrupt".to_string())?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8-Fehler: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn encrypt_decrypt_roundtrip() {
        let key = [42u8; 32];
        let password = "Geheimes-Passwort-123!@#";
        let encrypted = encrypt_password(password, &key).unwrap();
        let decrypted = decrypt_password(&encrypted, &key).unwrap();
        assert_eq!(password, decrypted);
    }

    #[test]
    fn different_nonces_produce_different_ciphertexts() {
        let key = [42u8; 32];
        let password = "test";
        let a = encrypt_password(password, &key).unwrap();
        let b = encrypt_password(password, &key).unwrap();
        assert_ne!(a, b); // Different nonces → different output
    }

    #[test]
    fn wrong_key_fails() {
        let key_a = [1u8; 32];
        let key_b = [2u8; 32];
        let encrypted = encrypt_password("secret", &key_a).unwrap();
        assert!(decrypt_password(&encrypted, &key_b).is_err());
    }
}
