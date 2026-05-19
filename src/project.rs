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

pub fn decode_project_path(encoded: &str) -> String {
    // First "--" is the drive letter separator (e.g., "E--" -> "E:\")
    // Remaining "--" and "-" are path separators ("\")
    if let Some(pos) = encoded.find("--") {
        let mut result = String::with_capacity(encoded.len() + 8);
        result.push_str(&encoded[..pos]);
        result.push_str(":\\");
        let rest = &encoded[pos + 2..];
        result.push_str(&rest.replace("--", "\\").replace('-', "\\"));
        result
    } else {
        encoded.replace('-', "\\")
    }
}

pub fn encode_project_path(path: &str) -> String {
    let with_drive = path.replace(':', "").replace('\\', "-").replace('/', "-");
    with_drive
}

pub fn add_project(path: &str) -> Option<Project> {
    let project_path = Path::new(path);
    if !project_path.join(".claude").exists() {
        return None;
    }

    let name = project_path.file_name()?.to_string_lossy().to_string();
    let encoded = encode_project_path(path);

    let home = dirs::home_dir()?;
    let claude_project_dir = home.join(".claude").join("projects").join(&encoded);

    let session_count = if claude_project_dir.exists() {
        count_sessions(&claude_project_dir)
    } else {
        0
    };

    let last_active = if claude_project_dir.exists() {
        get_last_active(&claude_project_dir)
    } else {
        None
    };

    Some(Project {
        name,
        path: project_path.to_path_buf(),
        encoded_name: encoded,
        session_count,
        last_active,
        has_claude_md: project_path.join(".claude").join("CLAUDE.md").exists(),
    })
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
