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
    pub batch_id: String,
}

fn session_pics_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path)
        .join(".claude_hub")
        .join("session_pics")
}

fn mime_for_ext(ext: &str) -> &'static str {
    match ext.to_ascii_lowercase().as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/png",
    }
}

#[tauri::command]
pub fn save_session_images(
    project_path: String,
    images: Vec<InputImage>,
) -> Result<Vec<SavedImage>, String> {
    let batch_id = chrono::Local::now().format("%Y%m%d_%H%M%S").to_string();
    let dir = session_pics_dir(&project_path).join(&batch_id);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create dir: {}", e))?;

    let mut saved = Vec::new();

    for (i, img) in images.iter().enumerate() {
        let index = (i + 1) as u32;
        let label = img
            .label
            .clone()
            .unwrap_or_else(|| format!("\u{56de}\u{7247}{}", index));
        let ext = PathBuf::from(&img.filename)
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("png")
            .to_string();
        let filename = format!("{}_{}.{}", index, label, ext);
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
            batch_id: batch_id.clone(),
        });
    }
    Ok(saved)
}

#[tauri::command]
pub fn read_image_as_data_url(path: String) -> Result<String, String> {
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read image: {}", e))?;
    let pb = PathBuf::from(&path);
    let ext = pb
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png");
    let mime = mime_for_ext(ext);
    let b64 = BASE64.encode(&bytes);
    Ok(format!("data:{};base64,{}", mime, b64))
}
