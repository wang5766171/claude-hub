use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

fn serialize_pathbuf<S: serde::Serializer>(path: &PathBuf, s: S) -> Result<S::Ok, S::Error> {
    s.serialize_str(&path.to_string_lossy())
}

fn serialize_option_datetime<S: serde::Serializer>(dt: &Option<DateTime<Utc>>, s: S) -> Result<S::Ok, S::Error> {
    match dt {
        Some(d) => s.serialize_str(&d.to_rfc3339()),
        None => s.serialize_none(),
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ContentBlock {
    #[serde(rename = "text")]
    Text { text: String },
    #[serde(rename = "tool_use")]
    ToolUse {
        id: String,
        name: String,
        #[serde(default)]
        input: serde_json::Value,
    },
    #[serde(rename = "tool_result")]
    ToolResult {
        #[serde(rename = "tool_use_id")]
        tool_use_id: String,
        content: serde_json::Value,
    },
    #[serde(rename = "thinking")]
    Thinking { thinking: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: Vec<ContentBlock>,
    pub timestamp: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Session {
    pub id: String,
    #[serde(serialize_with = "serialize_pathbuf")]
    pub path: PathBuf,
    pub messages: Vec<Message>,
    #[serde(serialize_with = "serialize_option_datetime")]
    pub started_at: Option<DateTime<Utc>>,
}

const CONVERSATION_TYPES: &[&str] = &["user", "assistant"];

fn parse_content_blocks(value: &serde_json::Value) -> Vec<ContentBlock> {
    match value {
        serde_json::Value::String(s) => {
            if s.trim().is_empty() {
                vec![]
            } else {
                vec![ContentBlock::Text { text: s.clone() }]
            }
        }
        serde_json::Value::Array(arr) => {
            arr.iter()
                .filter_map(|item| serde_json::from_value(item.clone()).ok())
                .collect()
        }
        _ => vec![],
    }
}

pub fn parse_message(line: &str) -> Option<Message> {
    if line.trim().is_empty() {
        return None;
    }
    let v: serde_json::Value = serde_json::from_str(line).ok()?;

    let role = v.get("type")?.as_str()?.to_string();

    if !CONVERSATION_TYPES.contains(&role.as_str()) {
        return None;
    }

    let content_value = v.get("message")
        .and_then(|m| m.get("content"))
        .cloned()
        .unwrap_or(serde_json::Value::Null);

    let content = parse_content_blocks(&content_value);

    if content.is_empty() {
        return None;
    }

    let timestamp = v.get("timestamp").and_then(|t| t.as_i64());

    Some(Message { role, content, timestamp })
}

fn merge_tool_results(messages: &mut Vec<Message>) {
    let mut i = 1;
    while i < messages.len() {
        let is_only_tool_results = messages[i].role == "user"
            && !messages[i].content.is_empty()
            && messages[i].content.iter().all(|b| matches!(b, ContentBlock::ToolResult { .. }));

        if is_only_tool_results && messages[i - 1].role == "assistant" {
            let blocks: Vec<ContentBlock> = messages[i].content.drain(..).collect();
            messages[i - 1].content.extend(blocks);
            messages.remove(i);
            continue;
        }
        i += 1;
    }
}

pub fn load_session(path: &Path) -> Option<Session> {
    let id = path.file_stem()?.to_string_lossy().to_string();
    let content = std::fs::read_to_string(path).ok()?;

    let mut messages: Vec<Message> = content.lines()
        .filter_map(|line| parse_message(line))
        .collect();

    merge_tool_results(&mut messages);

    if messages.is_empty() {
        return None;
    }

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
