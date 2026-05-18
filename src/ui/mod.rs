use ratatui::{Frame, layout::{Constraint, Direction, Layout}};
use crate::app::App;

mod sidebar;
mod main_panel;
mod detail;
mod status_bar;
mod help_overlay;

pub fn render(f: &mut Frame, app: &App) {
    let size = f.area();

    let main_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(1)])
        .split(size);

    let body = main_chunks[0];
    let status = main_chunks[1];

    let columns = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([
            Constraint::Length(24),
            Constraint::Min(30),
            Constraint::Min(30),
        ])
        .split(body);

    sidebar::render(f, columns[0], app);
    main_panel::render(f, columns[1], app);
    detail::render(f, columns[2], app);
    status_bar::render(f, status, app);

    if app.mode == crate::app::Mode::Help {
        help_overlay::render(f, size);
    }
}
