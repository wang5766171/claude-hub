use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
pub struct InputImage {
    pub data: String,
    pub filename: String,
    pub label: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SavedImage {
    pub path: String,
    pub label: String,
    pub index: u32,
}

fn session_pics_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".claude_hub")
        .join("session_pics")
}

#[tauri::command]
pub fn save_session_images(
    project_path: String,
    images: Vec<InputImage>,
) -> Result<Vec<SavedImage>, String> {
    let dir = session_pics_dir(&project_path);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create dir: {}", e))?;

    let mut saved = Vec::new();
    for (i, img) in images.iter().enumerate() {
        let index = (i + 1) as u32;
        let label = img
            .label
            .clone()
            .unwrap_or_else(|| format!("\u{56fe}\u{7247}{}", index));
        let ext = PathBuf::from(&img.filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png")
            .to_string();
        let filename = format!("{:02}_{}.{}", index, label, ext);
        let filepath = dir.join(&filename);

        let bytes = BASE64
            .decode(&img.data)
            .map_err(|e| format!("Decode failed for {}: {}", img.filename, e))?;
        fs::write(&filepath, bytes)
            .map_err(|e| format!("Write failed for {}: {}", filename, e))?;

        saved.push(SavedImage {
            path: filepath.to_string_lossy().to_string(),
            label,
            index,
        });
    }
    Ok(saved)
}
