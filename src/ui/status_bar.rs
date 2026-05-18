use ratatui::{Frame, layout::Rect, widgets::Paragraph};
use crate::app::App;

pub fn render(f: &mut Frame, area: Rect, app: &App) {
    let model = app.config.as_ref()
        .and_then(|c| c.model.as_ref())
        .map(|m| m.as_str())
        .unwrap_or("unknown");

    let text = format!(
        " q:Quit | Tab:Switch | j/k:Nav | ?:Help | Model: {} | Projects: {}",
        model,
        app.projects.len(),
    );

    let paragraph = Paragraph::new(text)
        .style(ratatui::style::Style::default().add_modifier(ratatui::style::Modifier::REVERSED));
    f.render_widget(paragraph, area);
}
