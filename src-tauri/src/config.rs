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

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupEntry {
    pub name: String,
    pub path: String,
    pub timestamp: Option<String>,
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

pub fn list_backups() -> Result<Vec<BackupEntry>, Box<dyn std::error::Error>> {
    let backup_dir = claude_dir()?.join("backups");
    if !backup_dir.exists() {
        return Ok(Vec::new());
    }
    let mut backups: Vec<BackupEntry> = std::fs::read_dir(&backup_dir)?
        .filter_map(|e| e.ok())
        .map(|e| {
            let path = e.path();
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            let timestamp = path
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .strip_prefix("settings_")
                .and_then(|s| {
                    chrono::NaiveDateTime::parse_from_str(s, "%Y%m%d_%H%M%S")
                        .ok()
                        .map(|dt| dt.format("%Y-%m-%d %H:%M:%S").to_string())
                });
            BackupEntry {
                name,
                path: path.to_string_lossy().to_string(),
                timestamp,
            }
        })
        .filter(|b| b.name.ends_with(".json"))
        .collect();
    backups.sort_by(|a, b| b.name.cmp(&a.name));
    Ok(backups)
}

pub fn restore_backup(backup_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let dst = config_path()?;
    let content = std::fs::read_to_string(backup_path)?;
    let _: ClaudeConfig = serde_json::from_str(&content)?;
    std::fs::write(&dst, content)?;
    Ok(())
}

pub fn export_config(export_path: &str) -> Result<(), Box<dyn std::error::Error>> {
    let src = config_path()?;
    let content = std::fs::read_to_string(&src)?;
    std::fs::write(export_path, content)?;
    Ok(())
}

pub fn import_config(import_path: &str) -> Result<ClaudeConfig, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(import_path)?;
    let config: ClaudeConfig = serde_json::from_str(&content)?;
    let dst = config_path()?;
    backup_config()?;
    std::fs::write(&dst, &content)?;
    Ok(config)
}
