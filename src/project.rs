use std::path::{Path, PathBuf};

#[derive(Debug, Clone)]
pub struct Project {
    pub name: String,
    pub path: PathBuf,
    pub encoded_name: String,
    pub session_count: usize,
    pub last_active: Option<String>,
    pub has_claude_md: bool,
}

pub fn scan_projects() -> Vec<Project> {
    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return Vec::new(),
    };
    let projects_dir = home.join(".claude").join("projects");
    if !projects_dir.exists() {
        return Vec::new();
    }

    let mut projects = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&projects_dir) {
        for entry in entries.flatten() {
            let encoded_name = entry.file_name().to_string_lossy().to_string();
            if let Some(project) = parse_project(&projects_dir, &encoded_name) {
                projects.push(project);
            }
        }
    }
    projects.sort_by(|a, b| b.last_active.cmp(&a.last_active));
    projects
}

fn parse_project(projects_dir: &Path, encoded_name: &str) -> Option<Project> {
    let project_dir = projects_dir.join(encoded_name);
    if !project_dir.is_dir() {
        return None;
    }

    let decoded_path = decode_project_path(encoded_name);
    let name = Path::new(&decoded_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let session_count = count_sessions(&project_dir);
    let last_active = get_last_active(&project_dir);
    let has_claude_md = Path::new(&decoded_path).join(".claude").join("CLAUDE.md").exists();

    Some(Project {
        name,
        path: PathBuf::from(&decoded_path),
        encoded_name: encoded_name.to_string(),
        session_count,
        last_active,
        has_claude_md,
    })
}

fn decode_project_path(encoded: &str) -> String {
    encoded.replace("--", ":\\").replace("-", "\\")
}

fn count_sessions(dir: &Path) -> usize {
    std::fs::read_dir(dir)
        .map(|entries| entries.filter_map(|e| e.ok()).filter(|e| {
            e.path().extension().map(|ext| ext == "jsonl").unwrap_or(false)
        }).count())
        .unwrap_or(0)
}

fn get_last_active(dir: &Path) -> Option<String> {
    std::fs::read_dir(dir)
        .ok()?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "jsonl").unwrap_or(false))
        .filter_map(|e| e.metadata().ok()?.modified().ok())
        .max()
        .map(|t| {
            let datetime: chrono::DateTime<chrono::Local> = t.into();
            datetime.format("%Y-%m-%d %H:%M").to_string()
        })
}
