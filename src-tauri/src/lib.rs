mod compress;
mod crypto;
mod font_subset;
mod merge;
mod sign;
mod database;
mod encryption;
mod mail;
mod settings;

use std::sync::Mutex;
use tauri::Manager;

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let app_data = app
                .path()
                .app_data_dir()
                .expect("Kein AppData-Verzeichnis");

            // Machine key fuer Passwort-Verschluesselung laden oder erzeugen
            let machine_key = crypto::load_or_create_machine_key(&app_data)
                .expect("Machine Key Initialisierung fehlgeschlagen");
            app.manage(database::MachineKey(machine_key));

            // Datenbank initialisieren
            let db_path = app_data.join("history.db");
            let conn = database::init_db(&db_path)
                .expect("Datenbank-Initialisierung fehlgeschlagen");
            settings::init_settings_table(&conn)
                .expect("Settings-Tabelle fehlgeschlagen");
            app.manage(Mutex::new(conn));

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            encryption::encrypt_pdf,
            encryption::select_pdf,
            encryption::select_save_path,
            database::save_history,
            database::get_history,
            database::delete_history,
            mail::open_pdf_mail,
            mail::open_password_mail,
            mail::show_in_folder,
            settings::get_settings,
            settings::update_settings,
            settings::reset_data,
            settings::select_directory,
            compress::analyze_pdf,
            compress::compress_pdf,
            compress::select_compress_save_path,
            merge::merge_pdfs,
            merge::select_multiple_pdfs,
            merge::select_merge_save_path,
            merge::print_pdf,
            sign::bitsign_status,
            sign::bitsign_set_enabled,
            sign::bitsign_login,
            sign::bitsign_logout,
            sign::bitsign_upload_pdf,
            sign::bitsign_sign_pdf,
            sign::bitsign_save_signed,
        ]);

    builder
        .run(tauri::generate_context!())
        .expect("Fehler beim Starten der Anwendung");
}
