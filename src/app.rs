use crate::config::ClaudeConfig;
use crate::history::HistoryEntry;
use crate::project::Project;
use crate::session::Session;

pub const MODEL_PRESETS: &[(&str, &str)] = &[
    ("Opus", "opus[1m]"),
    ("Sonnet", "sonnet[1m]"),
    ("Haiku", "haiku[1m]"),
    ("Custom", ""),
];

#[derive(Debug, Clone, PartialEq)]
pub enum Mode {
    ProjectList,
    ProjectDetail,
    GlobalConfig,
    ConfigEditor,
    SessionViewer,
    Help,
    AddProjectInput,
}

pub struct App {
    pub mode: Mode,
    pub projects: Vec<Project>,
    pub selected_project: Option<usize>,
    pub config: Option<ClaudeConfig>,
    pub selected_config_field: usize,
    pub should_quit: bool,
    pub sessions: Vec<Session>,
    pub history: Vec<HistoryEntry>,
    pub selected_preset: usize,
    pub edit_buffer: String,
    pub input_buffer: String,
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
            sessions: Vec::new(),
            history: Vec::new(),
            selected_preset: 0,
            edit_buffer: String::new(),
            input_buffer: String::new(),
        }
    }

    pub fn load(&mut self) {
        self.projects = crate::project::scan_projects();
        self.config = crate::config::load_config().ok();
        self.history = crate::history::load_history();
    }

    pub fn load_sessions(&mut self) {
        if let Some(idx) = self.selected_project {
            if idx < self.projects.len() {
                let home = dirs::home_dir().unwrap();
                let project_dir = home.join(".claude").join("projects").join(&self.projects[idx].encoded_name);
                self.sessions = crate::session::list_sessions(&project_dir);
            }
        }
    }

    pub fn handle_key(&mut self, key: crossterm::event::KeyEvent) {
        use crossterm::event::KeyCode;

        if self.mode == Mode::Help {
            if matches!(key.code, KeyCode::Esc | KeyCode::Char('?')) {
                self.mode = Mode::ProjectList;
            }
            return;
        }

        if self.mode == Mode::ConfigEditor {
            match key.code {
                KeyCode::Char('j') | KeyCode::Down => {
                    if self.selected_preset < MODEL_PRESETS.len() - 1 {
                        self.selected_preset += 1;
                    }
                }
                KeyCode::Char('k') | KeyCode::Up => {
                    if self.selected_preset > 0 {
                        self.selected_preset -= 1;
                    }
                }
                KeyCode::Enter => {
                    let preset = MODEL_PRESETS[self.selected_preset];
                    if let Some(ref mut config) = self.config {
                        let new_model = if preset.1.is_empty() {
                            self.edit_buffer.clone()
                        } else {
                            preset.1.to_string()
                        };
                        config.model = Some(new_model);
                        let _ = crate::config::save_config(config);
                    }
                    self.mode = Mode::GlobalConfig;
                }
                KeyCode::Esc => {
                    self.mode = Mode::GlobalConfig;
                }
                KeyCode::Char(c) if self.selected_preset == MODEL_PRESETS.len() - 1 => {
                    self.edit_buffer.push(c);
                }
                KeyCode::Backspace if self.selected_preset == MODEL_PRESETS.len() - 1 => {
                    self.edit_buffer.pop();
                }
                _ => {}
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
                self.load_sessions();
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
