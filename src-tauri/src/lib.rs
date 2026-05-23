mod project;
mod config;
mod session;
mod history;
mod hub;
mod command;
mod project_config;
mod chat;
mod image;

use std::collections::HashMap;
use tauri::Manager;

#[tauri::command]
fn scan_projects() -> Vec<project::Project> {
    project::scan_projects()
}

#[tauri::command]
fn add_project(path: String) -> Result<project::Project, String> {
    project::add_project(&path).ok_or_else(|| format!("No .claude directory found at: {}", path))
}

#[tauri::command]
fn remove_project(encoded_name: String) -> Result<(), String> {
    hub::hide_project(&encoded_name).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_sessions(encoded_name: String) -> Result<Vec<session::Session>, String> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let projects_dir = home.join(".claude").join("projects");
    let project_dir = projects_dir.join(&encoded_name);
    if !project_dir.exists() {
        return Err(format!("Project directory not found: {}", encoded_name));
    }

    let mut all_sessions = session::list_sessions(&project_dir);

    // Also load sessions from merged secondaries
    if let Ok(secondaries) = hub::get_merged_secondaries(&encoded_name) {
        for sec in secondaries {
            let sec_dir = projects_dir.join(&sec);
            if sec_dir.exists() {
                let mut sec_sessions = session::list_sessions(&sec_dir);
                all_sessions.append(&mut sec_sessions);
            }
        }
    }

    // Sort all by started_at (most recent first)
    all_sessions.sort_by(|a, b| b.started_at.cmp(&a.started_at));

    Ok(all_sessions)
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

#[tauri::command]
fn load_language() -> Result<Option<String>, String> {
    hub::load_language().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_language(lang: String) -> Result<(), String> {
    hub::save_language(&lang).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_always_on_top() -> Result<bool, String> {
    hub::load_always_on_top().map_err(|e| e.to_string())
}

#[tauri::command]
fn toggle_always_on_top(app: tauri::AppHandle) -> Result<bool, String> {
    let current = hub::load_always_on_top().map_err(|e| e.to_string())?;
    let new_value = !current;

    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(new_value).map_err(|e| e.to_string())?;
    }

    hub::save_always_on_top(new_value).map_err(|e| e.to_string())?;
    Ok(new_value)
}

#[tauri::command]
fn list_custom_commands() -> Result<Vec<command::CustomCommand>, String> {
    command::list_custom_commands().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_custom_command(cmd: command::CustomCommand) -> Result<(), String> {
    command::save_custom_command(cmd).map_err(|e| e.to_string())
}

#[tauri::command]
fn delete_custom_command(id: String) -> Result<(), String> {
    command::delete_custom_command(&id).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_in_terminal(project_path: String, resume_session_id: Option<String>) -> Result<u32, String> {
    command::open_in_terminal(&project_path, resume_session_id.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn register_terminal_session(session_id: String, pid: u32, project_path: String) -> Result<(), String> {
    hub::register_terminal_session(session_id, pid, project_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn find_session_terminal(session_id: String) -> Result<Option<hub::TerminalSessionInfo>, String> {
    hub::find_session_terminal(&session_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn focus_session_terminal(session_id: String) -> Result<bool, String> {
    hub::focus_session_terminal(&session_id).map_err(|e| e.to_string())
}

#[tauri::command]
fn cleanup_dead_sessions() -> Result<u32, String> {
    hub::cleanup_dead_sessions().map_err(|e| e.to_string())
}

#[tauri::command]
fn run_in_terminal(command: String, cwd: Option<String>) -> Result<bool, String> {
    command::run_in_terminal(&command, cwd.as_deref()).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_project_settings(project_path: String) -> Result<project_config::ProjectSettings, String> {
    project_config::load_project_settings(&project_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_project_settings_local(project_path: String) -> Result<project_config::ProjectSettings, String> {
    project_config::load_project_settings_local(&project_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_project_settings(project_path: String, settings: project_config::ProjectSettings) -> Result<(), String> {
    project_config::save_project_settings(&project_path, &settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_project_settings_local(project_path: String, settings: project_config::ProjectSettings) -> Result<(), String> {
    project_config::save_project_settings_local(&project_path, &settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_claude_md(project_path: String) -> Result<Option<String>, String> {
    project_config::load_claude_md(&project_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_project_metas() -> Result<HashMap<String, hub::ProjectMeta>, String> {
    hub::load_project_metas().map_err(|e| e.to_string())
}

#[tauri::command]
fn save_project_meta(encoded_name: String, meta: hub::ProjectMeta) -> Result<(), String> {
    hub::save_project_meta(&encoded_name, meta).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_level1_dir_cmd(encoded_name: String) -> Result<Option<String>, String> {
    let decoded = project::decode_project_path(&encoded_name);
    Ok(project::get_level1_dir(&decoded))
}

#[tauri::command]
fn get_mergeable_projects(encoded_name: String) -> Result<Vec<String>, String> {
    let projects = project::scan_projects();
    let mergeable: Vec<String> = projects.iter()
        .filter(|p| p.encoded_name != encoded_name)
        .map(|p| p.encoded_name.clone())
        .collect();
    Ok(mergeable)
}

#[tauri::command]
fn merge_projects_logical(primary: String, secondaries: Vec<String>) -> Result<(), String> {
    hub::merge_projects_logical(&primary, secondaries).map_err(|e| e.to_string())
}

#[tauri::command]
fn split_project(primary: String) -> Result<(), String> {
    hub::split_project(&primary).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_project_merges() -> Result<std::collections::HashMap<String, Vec<String>>, String> {
    let merges = hub::load_project_merges().map_err(|e| e.to_string())?;
    Ok(merges.merges)
}

#[tauri::command]
fn get_merged_secondaries(primary: String) -> Result<Vec<String>, String> {
    hub::get_merged_secondaries(&primary).map_err(|e| e.to_string())
}

#[tauri::command]
fn list_config_templates() -> Result<Vec<hub::ConfigTemplate>, String> {
    Ok(hub::list_config_templates())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            app.manage(std::sync::Mutex::new(chat::ChatState::new()));
            if let Ok(pinned) = hub::load_always_on_top() {
                if pinned {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.set_always_on_top(true);
                    }
                }
            }
            Ok(())
        })
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
            load_language,
            save_language,
            load_always_on_top,
            toggle_always_on_top,
            list_custom_commands,
            save_custom_command,
            delete_custom_command,
            open_in_terminal,
            register_terminal_session,
            find_session_terminal,
            focus_session_terminal,
            cleanup_dead_sessions,
            run_in_terminal,
            load_project_settings,
            load_project_settings_local,
            save_project_settings,
            save_project_settings_local,
            load_claude_md,
            load_project_metas,
            save_project_meta,
            get_level1_dir_cmd,
            get_mergeable_projects,
            merge_projects_logical,
            split_project,
            get_project_merges,
            get_merged_secondaries,
            list_config_templates,
            chat::send_message,
            chat::abort_chat,
            image::save_session_images,
            image::read_image_as_data_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
