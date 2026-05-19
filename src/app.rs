use crate::config::ClaudeConfig;
use crate::project::Project;

#[derive(Debug, Clone, PartialEq)]
pub enum Mode {
    ProjectList,
    ProjectDetail,
    GlobalConfig,
    ConfigEditor,
    SessionViewer,
    Help,
}

pub struct App {
    pub mode: Mode,
    pub projects: Vec<Project>,
    pub selected_project: Option<usize>,
    pub config: Option<ClaudeConfig>,
    pub selected_config_field: usize,
    pub should_quit: bool,
}

impl App {
    pub fn new() -> Self {
        Self {
            mode: Mode::ProjectList,
            projects: Vec::new(),
            selected_project: None,
            config: None,
            selected_config_field: 0,
            should_quit: false,
        }
    }

    pub fn load(&mut self) {
        self.projects = crate::project::scan_projects();
        self.config = crate::config::load_config().ok();
    }

    pub fn handle_key(&mut self, key: crossterm::event::KeyEvent) {
        use crossterm::event::KeyCode;

        if self.mode == Mode::Help {
            if matches!(key.code, KeyCode::Esc | KeyCode::Char('?')) {
                self.mode = Mode::ProjectList;
            }
            return;
        }

        match key.code {
            KeyCode::Char('q') | KeyCode::Char('Q') => {
                self.should_quit = true;
            }
            KeyCode::Tab => {
                self.mode = match self.mode {
                    Mode::ProjectList | Mode::ProjectDetail => Mode::GlobalConfig,
                    Mode::GlobalConfig | Mode::ConfigEditor => Mode::ProjectList,
                    _ => self.mode.clone(),
                };
                if self.mode == Mode::ProjectList {
                    self.selected_project = None;
                }
            }
            KeyCode::Esc => {
                self.mode = match self.mode {
                    Mode::ProjectDetail => Mode::ProjectList,
                    Mode::ConfigEditor => Mode::GlobalConfig,
                    Mode::SessionViewer => Mode::ProjectDetail,
                    _ => self.mode.clone(),
                };
            }
            KeyCode::Char('?') => {
                self.mode = Mode::Help;
            }
            KeyCode::Char('j') | KeyCode::Down => self.move_selection(1),
            KeyCode::Char('k') | KeyCode::Up => self.move_selection(-1),
            KeyCode::Enter => self.handle_enter(),
            KeyCode::Char('m') if self.mode == Mode::GlobalConfig => {
                self.mode = Mode::ConfigEditor;
            }
            _ => {}
        }
    }

    fn move_selection(&mut self, delta: i32) {
        match self.mode {
            Mode::ProjectList | Mode::ProjectDetail => {
                let len = self.projects.len();
                if len == 0 { return; }
                let current = self.selected_project.unwrap_or(0) as i32;
                let next = (current + delta).clamp(0, len as i32 - 1) as usize;
                self.selected_project = Some(next);
                self.mode = Mode::ProjectDetail;
            }
            Mode::GlobalConfig => {
                if let Some(ref config) = self.config {
                    let field_count = config.field_count();
                    if field_count == 0 { return; }
                    let current = self.selected_config_field as i32;
                    let next = (current + delta).clamp(0, field_count as i32 - 1) as usize;
                    self.selected_config_field = next;
                }
            }
            _ => {}
        }
    }

    fn handle_enter(&mut self) {
        match self.mode {
            Mode::ProjectDetail => {
                self.mode = Mode::SessionViewer;
            }
            _ => {}
        }
    }
}
