use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

fn hub_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let dir = home.join(".claude-hub");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<T, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content)?)
}

fn write_json<T: Serialize>(path: &PathBuf, data: &T) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(data)?;
    std::fs::write(path, json)?;
    Ok(())
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct SessionNames {
    pub names: HashMap<String, String>,
}

fn session_names_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("sessions.json"))
}

pub fn get_session_names() -> Result<HashMap<String, String>, Box<dyn std::error::Error>> {
    let path = session_names_path()?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let data: SessionNames = read_json(&path)?;
    Ok(data.names)
}

pub fn rename_session(session_id: String, name: String) -> Result<(), Box<dyn std::error::Error>> {
    let path = session_names_path()?;
    let mut data = if path.exists() {
        read_json::<SessionNames>(&path)?
    } else {
        SessionNames::default()
    };
    data.names.insert(session_id, name);
    write_json(&path, &data)
}

pub fn delete_session_name(session_id: String) -> Result<(), Box<dyn std::error::Error>> {
    let path = session_names_path()?;
    if !path.exists() {
        return Ok(());
    }
    let mut data: SessionNames = read_json(&path)?;
    data.names.remove(&session_id);
    write_json(&path, &data)
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppState {
    pub last_page: Option<String>,
    pub last_project: Option<String>,
    pub language: Option<String>,
}

fn state_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("state.json"))
}

pub fn load_state() -> Result<AppState, Box<dyn std::error::Error>> {
    let path = state_path()?;
    if !path.exists() {
        return Ok(AppState { last_page: None, last_project: None, language: None });
    }
    read_json(&path)
}

pub fn save_state(state: &AppState) -> Result<(), Box<dyn std::error::Error>> {
    let path = state_path()?;
    write_json(&path, state)
}

pub fn load_language() -> Result<Option<String>, Box<dyn std::error::Error>> {
    let state = load_state()?;
    Ok(state.language)
}

pub fn save_language(lang: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut state = load_state().unwrap_or(AppState { last_page: None, last_project: None, language: None });
    state.language = Some(lang.to_string());
    save_state(&state)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub config: crate::config::ClaudeConfig,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Presets {
    pub presets: Vec<Preset>,
}

fn presets_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("presets.json"))
}

pub fn list_presets() -> Result<Vec<Preset>, Box<dyn std::error::Error>> {
    let path = presets_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data: Presets = read_json(&path)?;
    Ok(data.presets)
}

pub fn save_preset(preset: Preset) -> Result<(), Box<dyn std::error::Error>> {
    let path = presets_path()?;
    let mut data = if path.exists() {
        read_json::<Presets>(&path)?
    } else {
        Presets::default()
    };
    if let Some(idx) = data.presets.iter().position(|p| p.id == preset.id) {
        data.presets[idx] = preset;
    } else {
        data.presets.push(preset);
    }
    write_json(&path, &data)
}

pub fn delete_preset(id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = presets_path()?;
    if !path.exists() {
        return Ok(());
    }
    let mut data: Presets = read_json(&path)?;
    data.presets.retain(|p| p.id != id);
    write_json(&path, &data)
}
