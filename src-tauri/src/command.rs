use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CustomCommand {
    pub id: String,
    pub name: String,
    pub command: String,
    #[serde(rename = "projectPath")]
    pub project_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandOutput {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub code: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Commands {
    pub commands: Vec<CustomCommand>,
}

fn commands_path() -> Result<PathBuf, Box<dyn std::error::Error>> {
    let home = dirs::home_dir().ok_or("Cannot find home directory")?;
    let dir = home.join(".claude-hub");
    std::fs::create_dir_all(&dir)?;
    Ok(dir.join("commands.json"))
}

fn read_json<T: for<'de> Deserialize<'de>>(path: &PathBuf) -> Result<T, Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string(path)?;
    Ok(serde_json::from_str(&content)?)
}

fn write_json<T: Serialize>(path: &PathBuf, data: &T) -> Result<(), Box<dyn std::error::Error>> {
    let json = serde_json::to_string_pretty(data)?;
    std::fs::write(path, json)?;
    Ok(())
}

pub fn list_custom_commands() -> Result<Vec<CustomCommand>, Box<dyn std::error::Error>> {
    let path = commands_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data: Commands = read_json(&path)?;
    Ok(data.commands)
}

pub fn save_custom_command(cmd: CustomCommand) -> Result<(), Box<dyn std::error::Error>> {
    let path = commands_path()?;
    let mut data = if path.exists() {
        read_json::<Commands>(&path)?
    } else {
        Commands::default()
    };
    if let Some(idx) = data.commands.iter().position(|c| c.id == cmd.id) {
        data.commands[idx] = cmd;
    } else {
        data.commands.push(cmd);
    }
    write_json(&path, &data)
}

pub fn delete_custom_command(id: &str) -> Result<(), Box<dyn std::error::Error>> {
    let path = commands_path()?;
    if !path.exists() {
        return Ok(());
    }
    let mut data: Commands = read_json(&path)?;
    data.commands.retain(|c| c.id != id);
    write_json(&path, &data)
}

pub fn open_in_terminal(project_path: &str, resume_session_id: Option<&str>) -> Result<u32, Box<dyn std::error::Error>> {
    let claude_cmd = match resume_session_id {
        Some(id) => format!("claude --resume {}", id),
        None => "claude".to_string(),
    };

    if cfg!(target_os = "windows") {
        // Try Windows Terminal first (creates visible window)
        let has_wt = std::process::Command::new("wt")
            .args(["--version"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false);

        if has_wt {
            let child = std::process::Command::new("wt")
                .args(["-d", project_path, "--", "cmd", "/K", &claude_cmd])
                .creation_flags(0x00000008) // CREATE_NO_WINDOW only for wt launcher
                .spawn()?;
            Ok(child.id())
        } else {
            // Fallback: cmd without CREATE_NO_WINDOW so window is visible
            let child = std::process::Command::new("cmd")
                .args(["/K", &format!("cd /D \"{}\" && {}", project_path, claude_cmd)])
                .spawn()?;
            Ok(child.id())
        }
    } else if cfg!(target_os = "macos") {
        let child = std::process::Command::new("open")
            .args(["-a", "Terminal", project_path])
            .spawn()?;
        // Small delay then run claude via AppleScript
        std::thread::sleep(std::time::Duration::from_millis(500));
        std::process::Command::new("osascript")
            .args([
                "-e",
                &format!("tell application \"Terminal\" to do script \"cd '{}' && {}\"", project_path, claude_cmd),
            ])
            .spawn()?;
        Ok(child.id())
    } else {
        // Linux: try common terminal emulators
        let terminal = which_terminal()?;
        let child = std::process::Command::new(terminal)
            .args(["-e", "sh", "-c", &format!("cd '{}' && {}", project_path, claude_cmd)])
            .spawn()?;
        Ok(child.id())
    }
}

fn which_terminal() -> Result<&'static str, Box<dyn std::error::Error>> {
    for term in &["gnome-terminal", "konsole", "xfce4-terminal", "xterm"] {
        if std::process::Command::new("which")
            .arg(term)
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
        {
            return Ok(term);
        }
    }
    Ok("xterm")
}

pub fn execute_command(command: &str, cwd: Option<&str>) -> Result<CommandOutput, Box<dyn std::error::Error>> {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = std::process::Command::new("cmd");
        c.args(["/C", command]);
        c
    } else {
        let mut c = std::process::Command::new("sh");
        c.args(["-c", command]);
        c
    };

    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }

    let output = cmd.output()?;
    Ok(CommandOutput {
        success: output.status.success(),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        code: output.status.code(),
    })
}
