use std::fs;
use std::path::PathBuf;

fn setup_test_env() -> (tempfile::TempDir, PathBuf) {
    let tmp = tempfile::TempDir::new().unwrap();
    let claude_dir = tmp.path().join(".claude");
    fs::create_dir_all(&claude_dir).unwrap();
    (tmp, claude_dir)
}

#[test]
fn test_load_config() {
    let (_tmp, claude_dir) = setup_test_env();
    let settings = claude_dir.join("settings.json");
    fs::write(&settings, r#"{"model":"opus[1m]","env":{}}"#).unwrap();
    let content = fs::read_to_string(&settings).unwrap();
    let config: serde_json::Value = serde_json::from_str(&content).unwrap();
    assert_eq!(config["model"], "opus[1m]");
}

#[test]
fn test_backup_creates_copy() {
    let (_tmp, claude_dir) = setup_test_env();
    let settings = claude_dir.join("settings.json");
    fs::write(&settings, r#"{"model":"opus[1m]"}"#).unwrap();
    let backup_dir = claude_dir.join("backups");
    fs::create_dir_all(&backup_dir).unwrap();
    let timestamp = chrono::Local::now().format("%Y%m%d_%H%M%S");
    let backup_path = backup_dir.join(format!("settings_{}.json", timestamp));
    fs::copy(&settings, &backup_path).unwrap();
    assert!(backup_path.exists());
    let content = fs::read_to_string(&backup_path).unwrap();
    assert!(content.contains("opus"));
}

#[test]
fn test_validate_json_roundtrip() {
    let original = r#"{"model":"opus[1m]","env":{"ANTHROPIC_MODEL":"glm-5.1"}}"#;
    let parsed: serde_json::Value = serde_json::from_str(original).unwrap();
    let serialized = serde_json::to_string_pretty(&parsed).unwrap();
    let reparsed: serde_json::Value = serde_json::from_str(&serialized).unwrap();
    assert_eq!(parsed, reparsed);
}
