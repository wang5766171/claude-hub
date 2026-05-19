use claude_hub::project;

#[test]
fn test_decode_simple_path() {
    assert_eq!(project::decode_project_path("E--Claude"), r"E:\Claude");
}

#[test]
fn test_decode_nested_path() {
    assert_eq!(
        project::decode_project_path("D--MyCodes-Milk-Order-all-sys"),
        r"D:\MyCodes\Milk\Order\all\sys"
    );
}

#[test]
fn test_decode_path_with_user() {
    assert_eq!(
        project::decode_project_path("C--Users-51743--agents-skills-custom"),
        r"C:\Users\51743\agents\skills\custom"
    );
}
