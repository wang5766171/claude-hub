use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

pub fn load_config() -> Result<ClaudeConfig, Box<dyn std::error::Error>> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let path = home.join(".claude").join("settings.json");
    let content = std::fs::read_to_string(&path)?;
    let config: ClaudeConfig = serde_json::from_str(&content)?;
    Ok(config)
}
