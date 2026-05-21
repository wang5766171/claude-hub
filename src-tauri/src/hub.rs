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

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct AppState {
    pub last_page: Option<String>,
    pub last_project: Option<String>,
    pub language: Option<String>,
    pub always_on_top: Option<bool>,
}

fn state_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("state.json"))
}

pub fn load_state() -> Result<AppState, Box<dyn std::error::Error>> {
    let path = state_path()?;
    if !path.exists() {
        return Ok(AppState::default());
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
    let mut state = load_state().unwrap_or_default();
    state.language = Some(lang.to_string());
    save_state(&state)
}

pub fn load_always_on_top() -> Result<bool, Box<dyn std::error::Error>> {
    let state = load_state();
    Ok(state.unwrap_or_default().always_on_top.unwrap_or(false))
}

pub fn save_always_on_top(value: bool) -> Result<(), Box<dyn std::error::Error>> {
    let mut state = load_state().unwrap_or_default();
    state.always_on_top = Some(value);
    save_state(&state)
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct HiddenProjects {
    pub encoded_names: Vec<String>,
}

fn hidden_projects_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("hidden_projects.json"))
}

pub fn hide_project(encoded_name: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = hidden_projects_path()?;
    let mut data = if path.exists() {
        read_json::<HiddenProjects>(&path)?
    } else {
        HiddenProjects::default()
    };
    if !data.encoded_names.contains(&encoded_name.to_string()) {
        data.encoded_names.push(encoded_name.to_string());
    }
    write_json(&path, &data)
}

pub fn is_project_hidden(encoded_name: &str) -> Result<bool, Box<dyn std::error::Error>> {
    let path = hidden_projects_path()?;
    if !path.exists() {
        return Ok(false);
    }
    let data: HiddenProjects = read_json(&path)?;
    Ok(data.encoded_names.contains(&encoded_name.to_string()))
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

// --- ProjectMeta (custom names, tags, notes) ---

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProjectMeta {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub custom_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tags: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProjectMetas {
    #[serde(default)]
    pub metas: HashMap<String, ProjectMeta>,
}

fn project_metas_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("project_meta.json"))
}

pub fn load_project_metas() -> Result<HashMap<String, ProjectMeta>, Box<dyn std::error::Error>> {
    let path = project_metas_path()?;
    if !path.exists() {
        return Ok(HashMap::new());
    }
    let metas: ProjectMetas = read_json(&path)?;
    Ok(metas.metas)
}

pub fn save_project_meta(encoded_name: &str, meta: ProjectMeta) -> Result<(), Box<dyn std::error::Error>> {
    let path = project_metas_path()?;
    let mut metas = if path.exists() {
        read_json::<ProjectMetas>(&path)?
    } else {
        ProjectMetas::default()
    };

    // If meta is all None/default, remove the entry
    if meta.custom_name.is_none() && meta.tags.is_none() && meta.notes.is_none() {
        metas.metas.remove(encoded_name);
    } else {
        metas.metas.insert(encoded_name.to_string(), meta);
    }

    write_json(&path, &metas)
}

// --- Project Merges ---

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ProjectMerges {
    #[serde(default)]
    pub merges: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PhysicalMergeUndo {
    pub primary: String,
    pub secondaries: Vec<SecondaryMove>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SecondaryMove {
    pub encoded_name: String,
    pub claude_dir_backup: Option<String>,
    pub project_claude_dir_backup: Option<String>,
}

fn project_merges_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("project_merges.json"))
}

fn physical_merge_undo_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(hub_dir()?.join("physical_merge_undo.json"))
}

pub fn load_project_merges() -> Result<ProjectMerges, Box<dyn std::error::Error>> {
    let path = project_merges_path()?;
    if !path.exists() {
        return Ok(ProjectMerges::default());
    }
    read_json(&path)
}

fn save_project_merges(merges: &ProjectMerges) -> Result<(), Box<dyn std::error::Error>> {
    write_json(&project_merges_path()?, merges)
}

pub fn merge_projects_logical(primary: &str, secondaries: Vec<String>) -> Result<(), Box<dyn std::error::Error>> {
    let mut merges = load_project_merges()?;

    // First, remove all secondaries from being primaries themselves
    for s in &secondaries {
        merges.merges.remove(s);
    }

    // Then, add secondaries to the primary's list
    let existing = merges.merges.entry(primary.to_string()).or_default();
    for s in secondaries {
        if !existing.contains(&s) {
            existing.push(s);
        }
    }

    save_project_merges(&merges)
}

pub fn split_project(primary: &str) -> Result<(), Box<dyn std::error::Error>> {
    let mut merges = load_project_merges()?;
    merges.merges.remove(primary);
    save_project_merges(&merges)
}

pub fn get_merged_secondaries(primary: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let merges = load_project_merges()?;
    Ok(merges.merges.get(primary).cloned().unwrap_or_default())
}

/// Get all secondary encoded names across all merges
pub fn get_all_secondaries() -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let merges = load_project_merges()?;
    Ok(merges.merges.values().flatten().cloned().collect())
}

/// Given a secondary encoded name, find which primary it belongs to
pub fn resolve_primary(secondary: &str) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let merges = load_project_merges()?;
    for (primary, secondaries) in &merges.merges {
        if secondaries.contains(&secondary.to_string()) {
            return Ok(Some(primary.clone()));
        }
    }
    Ok(None)
}
