use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
    pub timestamp: Option<i64>,
}

#[derive(Debug, Clone)]
pub struct Session {
    pub id: String,
    pub path: PathBuf,
    pub messages: Vec<Message>,
    pub started_at: Option<DateTime<Utc>>,
}

pub fn parse_message(line: &str) -> Option<Message> {
    if line.trim().is_empty() {
        return None;
    }
    let v: serde_json::Value = serde_json::from_str(line).ok()?;

    let role = v.get("type")?.as_str()?.to_string();

    let content = v.get("message")
        .and_then(|m| m.get("content"))
        .and_then(|c| {
            if c.is_string() {
                Some(c.as_str().unwrap_or("").to_string())
            } else {
                Some(c.to_string())
            }
        })
        .unwrap_or_default();

    let timestamp = v.get("timestamp").and_then(|t| t.as_i64());

    Some(Message { role, content, timestamp })
}

pub fn load_session(path: &Path) -> Option<Session> {
    let id = path.file_stem()?.to_string_lossy().to_string();
    let content = std::fs::read_to_string(path).ok()?;

    let messages: Vec<Message> = content.lines()
        .filter_map(|line| parse_message(line))
        .collect();

    let started_at = messages.first()
        .and_then(|m| m.timestamp)
        .map(|ts| DateTime::from_timestamp_millis(ts).unwrap_or_default());

    Some(Session {
        id,
        path: path.to_path_buf(),
        messages,
        started_at,
    })
}

pub fn list_sessions(project_dir: &Path) -> Vec<Session> {
    let mut sessions = Vec::new();
    if let Ok(entries) = std::fs::read_dir(project_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "jsonl").unwrap_or(false) {
                if let Some(session) = load_session(&path) {
                    sessions.push(session);
                }
            }
        }
    }
    sessions.sort_by(|a, b| b.started_at.cmp(&a.started_at));
    sessions
}
