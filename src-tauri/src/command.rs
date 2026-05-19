use serde::{Deserialize, Serialize};
use std::path::PathBuf;

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
