use ratatui::{Frame, layout::Rect, widgets::{Block, Borders, Paragraph}};
use crate::app::{App, Mode};

pub fn render(f: &mut Frame, area: Rect, app: &App) {
    let content = match app.mode {
        Mode::SessionViewer => {
            app.history.iter().take(20).map(|h| {
                let time = h.timestamp
                    .map(|ts| {
                        chrono::DateTime::from_timestamp_millis(ts)
                            .map(|dt| dt.format("%m-%d %H:%M").to_string())
                            .unwrap_or_default()
                    })
                    .unwrap_or_default();
                format!("{} {}", time, h.display)
            }).collect::<Vec<_>>().join("\n")
        }
        _ => {
            if let Some(idx) = app.selected_project {
                if idx < app.projects.len() {
                    let p = &app.projects[idx];
                    let settings_path = p.path.join(".claude").join("settings.local.json");
                    if settings_path.exists() {
                        std::fs::read_to_string(&settings_path).unwrap_or_default()
                    } else {
                        "No project settings".to_string()
                    }
                } else { "".to_string() }
            } else { "".to_string() }
        }
    };

    let paragraph = Paragraph::new(content)
        .block(Block::default().title("Detail").borders(Borders::ALL));
    f.render_widget(paragraph, area);
}
