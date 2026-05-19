mod project;
mod config;
mod session;
mod history;
mod hub;

use std::collections::HashMap;

#[tauri::command]
fn scan_projects() -> Vec<project::Project> {
    project::scan_projects()
}

#[tauri::command]
fn add_project(path: String) -> Result<project::Project, String> {
    project::add_project(&path).ok_or_else(|| format!("No .claude directory found at: {}", path))
}

#[tauri::command]
fn remove_project(_encoded_name: String) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
fn list_sessions(encoded_name: String) -> Result<Vec<session::Session>, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let project_dir = home.join(".claude").join("projects").join(&encoded_name);
    if !project_dir.exists() {
        return Err(format!("Project directory not found: {}", encoded_name));
    }
    Ok(session::list_sessions(&project_dir))
}

#[tauri::command]
fn get_session_messages(session_id: String, encoded_name: String) -> Result<Vec<session::Message>, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let session_path = home.join(".claude").join("projects").join(&encoded_name).join(format!("{}.jsonl", session_id));
    if !session_path.exists() {
        return Err(format!("Session file not found: {}", session_id));
    }
    session::load_session(&session_path)
        .map(|s| s.messages)
        .ok_or_else(|| format!("Failed to parse session: {}", session_id))
}

#[tauri::command]
fn get_session_names() -> Result<HashMap<String, String>, String> {
    hub::get_session_names().map_err(|e| e.to_string())
}

#[tauri::command]
fn rename_session(session_id: String, name: String) -> Result<(), String> {
    hub::rename_session(session_id, name).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_session_name(session_id: String) -> Result<(), String> {
    hub::delete_session_name(session_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_config() -> Result<config::ClaudeConfig, String> {
    config::load_config().map_err(|e| e.to_string())
}

#[tauri::command]
fn load_history() -> Vec<history::HistoryEntry> {
    history::load_history()
}

#[tauri::command]
fn save_config(config: config::ClaudeConfig) -> Result<(), String> {
    config::save_config(&config).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_presets() -> Result<Vec<hub::Preset>, String> {
    hub::list_presets().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_preset(preset: hub::Preset) -> Result<(), String> {
    hub::save_preset(preset).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_preset(id: String) -> Result<(), String> {
    hub::delete_preset(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn apply_preset(id: String) -> Result<(), String> {
    let presets = hub::list_presets().map_err(|e| e.to_string())?;
    let preset = presets.into_iter().find(|p| p.id == id).ok_or("Preset not found")?;
    config::save_config(&preset.config).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_backups() -> Result<Vec<config::BackupEntry>, String> {
    config::list_backups().map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_backup(backup_path: String) -> Result<(), String> {
    config::restore_backup(&backup_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_config(path: String) -> Result<(), String> {
    config::export_config(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn import_config(path: String) -> Result<config::ClaudeConfig, String> {
    config::import_config(&path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_projects,
            add_project,
            remove_project,
            list_sessions,
            get_session_messages,
            get_session_names,
            rename_session,
            delete_session_name,
            load_config,
            load_history,
            save_config,
            list_presets,
            save_preset,
            delete_preset,
            apply_preset,
            list_backups,
            restore_backup,
            export_config,
            import_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
