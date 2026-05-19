use ratatui::{Frame, layout::Rect, widgets::{Block, Borders, List, ListItem, ListState}};
use ratatui::style::{Color, Style, Modifier};
use ratatui::text::Span;
use crate::app::{App, Mode};

pub fn render(f: &mut Frame, area: Rect, app: &App) {
    let is_active = matches!(app.mode, Mode::ProjectList | Mode::ProjectDetail);
    let border_color = if is_active { Color::Cyan } else { Color::DarkGray };
    let title_color = if is_active { Color::Cyan } else { Color::DarkGray };

    let items: Vec<ListItem> = app.projects.iter().map(|p| {
        ListItem::new(format!(" {} ({})", p.name, p.session_count))
    }).collect();

    let list = List::new(items)
        .block(Block::default()
            .title(Span::styled("Projects", Style::default().fg(title_color)))
            .borders(Borders::ALL)
            .border_style(Style::default().fg(border_color)))
        .highlight_style(Style::default()
            .fg(Color::Yellow)
            .add_modifier(Modifier::BOLD));

    let mut state = ListState::default();
    if let Some(idx) = app.selected_project {
        state.select(Some(idx));
    }

    f.render_stateful_widget(list, area, &mut state);
}
