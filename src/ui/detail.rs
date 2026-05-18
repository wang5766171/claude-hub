use ratatui::{Frame, layout::Rect, widgets::{Block, Borders, Paragraph}};
use crate::app::App;

pub fn render(f: &mut Frame, area: Rect, app: &App) {
    let content = if let Some(idx) = app.selected_project {
        if idx < app.projects.len() {
            let p = &app.projects[idx];
            let settings_path = p.path.join(".claude").join("settings.local.json");
            if settings_path.exists() {
                std::fs::read_to_string(&settings_path).unwrap_or_else(|_| "Cannot read settings".to_string())
            } else {
                "No project settings".to_string()
            }
        } else {
            "".to_string()
        }
    } else {
        "".to_string()
    };

    let paragraph = Paragraph::new(content)
        .block(Block::default().title("Detail").borders(Borders::ALL));
    f.render_widget(paragraph, area);
}
