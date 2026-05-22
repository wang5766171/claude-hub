use serde::{Deserialize, Serialize, Deserializer};
use std::collections::HashMap;
use std::path::PathBuf;

fn deserialize_flex_env<'de, D>(deserializer: D) -> Result<Option<HashMap<String, String>>, D::Error>
where
    D: Deserializer<'de>,
{
    let opt: Option<HashMap<String, serde_json::Value>> = Option::deserialize(deserializer)?;
    Ok(opt.map(|map| {
        map.into_iter().map(|(k, v)| {
            let s = match v {
                serde_json::Value::String(s) => s,
                serde_json::Value::Number(n) => n.to_string(),
                serde_json::Value::Bool(b) => b.to_string(),
                other => other.to_string(),
            };
            (k, s)
        }).collect()
    }))
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClaudeConfig {
    pub model: Option<String>,
    #[serde(deserialize_with = "deserialize_flex_env")]
    pub env: Option<HashMap<String, String>>,
    #[serde(rename = "enabledPlugins")]
    pub enabled_plugins: Option<HashMap<String, bool>>,
    #[serde(rename = "skipDangerousModePermissionPrompt")]
    pub skip_dangerous: Option<bool>,

    #[serde(rename = "cleanupPeriodDays")]
    pub cleanup_period_days: Option<serde_json::Value>,

    #[serde(rename = "extraKnownMarketplaces")]
    pub extra_known_marketplaces: Option<serde_json::Value>,

    pub theme: Option<String>,
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

    let existing = if path.exists() {
        let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
        serde_json::from_str::<serde_json::Value>(&content).ok()
    } else {
        None
    };

    let mut new_value = serde_json::to_value(config).map_err(|e| e.to_string())?;

    if let (Some(existing_obj), Some(new_obj)) = (existing, new_value.as_object_mut()) {
        for (key, value) in existing_obj.as_object().unwrap_or(&serde_json::Map::new()) {
            if !new_obj.contains_key(key) {
                new_obj.insert(key.clone(), value.clone());
            }
        }
    }

    let json = serde_json::to_string_pretty(&new_value).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())?;

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
