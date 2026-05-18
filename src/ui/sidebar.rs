use ratatui::{Frame, layout::Rect, widgets::{Block, Borders, List, ListItem, ListState}};
use crate::app::App;

pub fn render(f: &mut Frame, area: Rect, app: &App) {
    let items: Vec<ListItem> = app.projects.iter().map(|p| {
        ListItem::new(format!(" {} ({})", p.name, p.session_count))
    }).collect();

    let list = List::new(items)
        .block(Block::default().title("Projects").borders(Borders::ALL))
        .highlight_style(ratatui::style::Style::default()
            .add_modifier(ratatui::style::Modifier::REVERSED));

    let mut state = ListState::default();
    if let Some(idx) = app.selected_project {
        state.select(Some(idx));
    }

    f.render_stateful_widget(list, area, &mut state);
}
