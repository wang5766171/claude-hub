use claude_hub::session;

#[test]
fn test_parse_session_header() {
    let line = r#"{"type":"human","message":{"content":"Hello"},"timestamp":1772354818995}"#;
    let msg = session::parse_message(line);
    assert!(msg.is_some());
    let msg = msg.unwrap();
    assert_eq!(msg.role, "human");
}

#[test]
fn test_parse_invalid_line() {
    let line = "not json";
    let msg = session::parse_message(line);
    assert!(msg.is_none());
}

#[test]
fn test_parse_empty_line() {
    let msg = session::parse_message("");
    assert!(msg.is_none());
}
