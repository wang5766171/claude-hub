@echo off
:: 启用延迟变量扩展，允许在 for 循环等复杂逻辑中动态读取变量值
setlocal enabledelayedexpansion
:: 将 Windows 控制台的字符集代码页切换为 UTF-8 (65001)，防止终端打印中文时出现乱码
chcp 65001 >nul

:: ==========================================
:: 环境编码初始化
:: ==========================================
:: 强制底层的 Python 引擎（Graphify 的运行环境）在读写文件时使用 UTF-8
:: 这是彻底解决 Obsidian 中生成的 Markdown 报告出现乱码的核心设置
set "PYTHONIOENCODING=utf-8"
set "PYTHONUTF8=1"

echo ===================================================
echo   Graphify 原生增量更新引擎 (节省 Token)
echo ===================================================

:: ==========================================
:: 目录路径推导
:: ==========================================
:: %~dp0 代表当前批处理脚本所在的驱动器和路径（例如 D:\项目\.graphify\）
set "SCRIPT_DIR=%~dp0"
:: 截取字符串，去掉路径最末尾的反斜杠（\），避免后续拼接出现双斜杠（\\）
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
:: 推导出代码项目的根目录（即 .graphify 文件夹的上一级）
set "PROJECT_ROOT=%SCRIPT_DIR%\.."

:: ==========================================
:: 读取外部配置
:: ==========================================
:: 检查环境变量文件是否存在，防止未配置环境就执行
if not exist "%SCRIPT_DIR%\.graphify-env" (
    echo [错误] 配置文件缺失 & pause & exit /b 1
)
:: 逐行读取 .graphify-env 文件，以等号 (=) 分隔键值对，并将其注册为系统的临时环境变量
for /f "usebackq tokens=1,* delims==" %%a in ("%SCRIPT_DIR%\.graphify-env") do (set "%%a=%%b")

:: ==========================================
:: 数据管道挂载 (核心解耦逻辑)
:: ==========================================
:: 根据读取到的配置，拼接出真实的 NAS/Obsidian 物理存储路径
set "OBSIDIAN_OUT=%OBSIDIAN_ROOT%\graphify\%PROJECT_CATEGORY%\graphify-out"
:: 拼接出代码项目根目录下的“影子”输出路径
set "LOCAL_OUT=%PROJECT_ROOT%\graphify-out"

:: 如果 Obsidian 端的物理目录还不存在，则提前创建它
if not exist "%OBSIDIAN_OUT%" mkdir "%OBSIDIAN_OUT%"

:: 检查本地项目目录下是否已经存在软链接（/al 参数用于查找链接文件）
dir /al "%LOCAL_OUT%" >nul 2>&1
if errorlevel 1 (
    :: errorlevel 1 表示没有找到软链接
    :: 如果存在同名的实体文件夹，则强制静默删除它，为软链接腾出位置
    if exist "%LOCAL_OUT%" rmdir /s /q "%LOCAL_OUT%"
    :: 创建反向软链接（目录联接 Junction）。
    :: 让 graphify 以为是在读写 LOCAL_OUT，实际上数据全部存入了 OBSIDIAN_OUT
    mklink /J "%LOCAL_OUT%" "%OBSIDIAN_OUT%" >nul
)

:: ==========================================
:: 唤起 AI 增量执行
:: ==========================================
echo [信息] 唤起 Claude 执行增量分析...
:: 切换工作目录到项目根目录，这是执行 graphify 命令的前提要求
cd /d "%PROJECT_ROOT%"

:: 通过命令行调用 Claude Code
:: --update: 核心参数，指令图谱引擎只扫描自上次以来发生变更的文件，结合缓存极大地节省 Token
call claude "请执行：/graphify . --update。注意：1. 仅处理变更文件并合并到现有图谱。2. 严格使用【中文】输出摘要。3. 【严禁使用无意义代号】：如果变更导致了新社区(Community)的生成，必须根据其代码逻辑为其命名一个具体的业务模块名称，如'AI调度中心'，绝对不能输出'Community X'！"

echo.
echo [成功] 增量数据已同步至第二大脑！
echo ===================================================
pause