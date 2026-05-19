use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeConfig {
    pub model: Option<String>,
    pub env: Option<HashMap<String, String>>,
    #[serde(rename = "enabledPlugins")]
    pub enabled_plugins: Option<HashMap<String, bool>>,
    #[serde(rename = "skipDangerousModePermissionPrompt")]
    pub skip_dangerous: Option<bool>,
}

impl ClaudeConfig {
    pub fn field_count(&self) -> usize {
        let mut count = 1;
        count += self.env.as_ref().map(|e| e.len()).unwrap_or(0);
        count
    }

    pub fn model_display(&self) -> &str {
        self.model.as_deref().unwrap_or("default")
    }
}

pub fn claude_dir() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    Ok(home.join(".claude"))
}

pub fn config_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    Ok(claude_dir()?.join("settings.json"))
}

pub fn load_config() -> Result<ClaudeConfig, Box<dyn std::error::Error>> {
    let path = config_path()?;
    let content = std::fs::read_to_string(&path)?;
    let config: ClaudeConfig = serde_json::from_str(&content)?;
    Ok(config)
}

pub fn save_config(config: &ClaudeConfig) -> Result<(), Box<dyn std::error::Error>> {
    let path = config_path()?;
    backup_config()?;
    let json = serde_json::to_string_pretty(config)?;
    std::fs::write(&path, json)?;
    // Validate roundtrip
    let written = std::fs::read_to_string(&path)?;
    let _: ClaudeConfig = serde_json::from_str(&written)?;
    Ok(())
}

pub fn backup_config() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let dir = claude_dir()?;
    let backup_dir = dir.join("backups");
    std::fs::create_dir_all(&backup_dir)?;
    let src = dir.join("settings.json");
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let dst = backup_dir.join(format!("settings_{}.json", timestamp));
    std::fs::copy(&src, &dst)?;
    Ok(dst)
}

pub fn list_backups() -> Result<Vec<PathBuf>, Box<dyn std::error::Error>> {
    let backup_dir = claude_dir()?.join("backups");
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }
    let mut backups: Vec<PathBuf> = std::fs::read_dir(&backup_dir)?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| p.extension().map(|e| e == "json").unwrap_or(false))
        .collect();
    backups.sort_by(|a, b| b.cmp(a));
    Ok(backups)
}

pub fn restore_backup(backup_path: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let dst = config_path()?;
    let content = std::fs::read_to_string(backup_path)?;
    let _: ClaudeConfig = serde_json::from_str(&content)?;
    std::fs::write(&dst, content)?;
    Ok(())
}
