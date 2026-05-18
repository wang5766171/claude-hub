use ratatui::{Frame, layout::Rect, widgets::{Block, Borders, Clear, Paragraph}};

pub fn render(f: &mut Frame, area: Rect) {
    let help_text = "\
q / Ctrl+c   Quit
Tab          Switch Project/Config mode
j/k or Up/Down Navigate list
Enter        Open/Edit selected
Esc          Back/Cancel
a            Add project
m            Model presets
?            Toggle help
";

    let paragraph = Paragraph::new(help_text)
        .block(Block::default().title("Help (?)").borders(Borders::ALL));

    let popup_area = centered_rect(40, 50, area);
    f.render_widget(Clear, popup_area);
    f.render_widget(paragraph, popup_area);
}

fn centered_rect(percent_x: u16, percent_y: u16, r: Rect) -> Rect {
    let popup_layout = ratatui::layout::Layout::default()
        .direction(ratatui::layout::Direction::Vertical)
        .constraints([
            ratatui::layout::Constraint::Percentage((100 - percent_y) / 2),
            ratatui::layout::Constraint::Percentage(percent_y),
            ratatui::layout::Constraint::Percentage((100 - percent_y) / 2),
        ])
        .split(r);

    ratatui::layout::Layout::default()
        .direction(ratatui::layout::Direction::Horizontal)
        .constraints([
            ratatui::layout::Constraint::Percentage((100 - percent_x) / 2),
            ratatui::layout::Constraint::Percentage(percent_x),
            ratatui::layout::Constraint::Percentage((100 - percent_x) / 2),
        ])
        .split(popup_layout[1])[1]
}
