@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul

:: 强制底层引擎使用 UTF-8，解决乱码问题
set "PYTHONIOENCODING=utf-8"
set "PYTHONUTF8=1"

echo ===================================================
echo   Graphify 原生深度构建引擎 (包含 Obsidian)
echo ===================================================

set "SCRIPT_DIR=%~dp0"
set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"
set "PROJECT_ROOT=%SCRIPT_DIR%\.."

:: 1. 读取环境配置
if not exist "%SCRIPT_DIR%\.graphify-env" (
    echo [错误] 找不到 .graphify-env 配置文件！
    pause & exit /b 1
)
for /f "usebackq tokens=1,* delims==" %%a in ("%SCRIPT_DIR%\.graphify-env") do (set "%%a=%%b")

:: 2. 路径规划
set "OBSIDIAN_OUT=%OBSIDIAN_ROOT%\graphify\%PROJECT_CATEGORY%\graphify-out"
set "LOCAL_OUT=%PROJECT_ROOT%\graphify-out"

:: 3. 确保存储目录存在
if not exist "%OBSIDIAN_OUT%" mkdir "%OBSIDIAN_OUT%"

:: 4. 建立唯一数据管道
dir /al "%LOCAL_OUT%" >nul 2>&1
if errorlevel 1 (
    if exist "%LOCAL_OUT%" rmdir /s /q "%LOCAL_OUT%"
    echo [连接] 正在挂载第二大脑数据管道...
    mklink /J "%LOCAL_OUT%" "%OBSIDIAN_OUT%" >nul
)

:: 5. 唤起 AI 助手
echo.
echo [信息] 管道就绪！正在唤起 Claude Code 执行深度构建...
cd /d "%PROJECT_ROOT%"
call claude "请按顺序执行：1. 运行 /graphify . --obsidian 构建图谱。要求：所有报告和节点摘要必须使用【中文】；【核心重命名规则】：针对底层的聚类节点(Community/Cluster)，你必须通读其包含的文件语义，为其提炼并赋予一个【真实且具备业务含义的名称】（例如'用户鉴权核心模块'、'数据库路由调度'等），绝不允许在最终输出中使用 'Community 1' 或 '社区 1' 这种无意义的默认代号！2. 运行 python -m graphify claude install。3. 运行 python -m graphify hook install。"

echo.
echo [成功] 知识体系已无缝同步！
echo ===================================================
pause