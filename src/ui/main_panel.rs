use ratatui::{Frame, layout::Rect, widgets::{Block, Borders, Paragraph}};
use ratatui::style::{Color, Style};
use ratatui::text::Span;
use crate::app::{App, Mode};

pub fn render(f: &mut Frame, area: Rect, app: &App) {
    let content = match app.mode {
        Mode::ProjectList | Mode::ProjectDetail => {
            if let Some(idx) = app.selected_project {
                if idx < app.projects.len() {
                    let p = &app.projects[idx];
                    format!(
                        "Name: {}\nPath: {}\nSessions: {}\nLast Active: {}\nCLAUDE.md: {}",
                        p.name,
                        p.path.display(),
                        p.session_count,
                        p.last_active.as_deref().unwrap_or("N/A"),
                        if p.has_claude_md { "Yes" } else { "No" },
                    )
                } else {
                    "Select a project".to_string()
                }
            } else {
                "Use j/k to select a project".to_string()
            }
        }
        Mode::GlobalConfig => {
            if let Some(ref config) = app.config {
                let mut lines = vec![format!("Model: {}", config.model.as_deref().unwrap_or("default"))];
                if let Some(ref env) = config.env {
                    for (k, v) in env {
                        let display_val = if k.contains("TOKEN") {
                            "***masked***".to_string()
                        } else {
                            v.clone()
                        };
                        lines.push(format!("env.{}: {}", k, display_val));
                    }
                }
                lines.join("\n")
            } else {
                "Failed to load config".to_string()
            }
        }
        Mode::ConfigEditor => {
            let mut lines = vec!["Model Presets:".to_string(), String::new()];
            for (i, (name, value)) in crate::app::MODEL_PRESETS.iter().enumerate() {
                let marker = if i == app.selected_preset { ">" } else { " " };
                let display = if value.is_empty() {
                    if i == app.selected_preset {
                        format!("{} {} [{}]", marker, name, app.edit_buffer)
                    } else {
                        format!("{} {} (type to input)", marker, name)
                    }
                } else {
                    format!("{} {} ({})", marker, name, value)
                };
                lines.push(display);
            }
            lines.join("\n")
        }
        Mode::SessionViewer => {
            if app.sessions.is_empty() {
                "No sessions found".to_string()
            } else {
                app.sessions.iter().map(|s| {
                    let time = s.started_at
                        .map(|t| t.format("%Y-%m-%d %H:%M").to_string())
                        .unwrap_or_else(|| "unknown".to_string());
                    let msg_count = s.messages.len();
                    format!("{} | {} msgs | {}", &s.id[..8], msg_count, time)
                }).collect::<Vec<_>>().join("\n")
            }
        }
        Mode::Help => "Help overlay shown".to_string(),
        Mode::AddProjectInput => {
            format!("Enter project path:\n\n> {}\n\n(Press Enter to confirm, Esc to cancel)", app.input_buffer)
        }
    };

    let title = match app.mode {
        Mode::ProjectList | Mode::ProjectDetail => "Project Detail",
        Mode::GlobalConfig => "Global Config",
        Mode::ConfigEditor => "Model Presets",
        Mode::SessionViewer => "Session",
        Mode::AddProjectInput => "Add Project",
        _ => "Main",
    };

    let paragraph = Paragraph::new(content)
        .block(Block::default()
            .title(Span::styled(title, Style::default().fg(Color::Cyan)))
            .borders(Borders::ALL)
            .border_style(Style::default().fg(Color::Cyan)));
    f.render_widget(paragraph, area);
}
