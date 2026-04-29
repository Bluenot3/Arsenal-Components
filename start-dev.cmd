@echo off
set "NODE_EXE=C:\Users\AlexT\AppData\Local\ms-playwright-go\1.57.0\node.exe"
set "NODE_DIR=C:\Users\AlexT\AppData\Local\ms-playwright-go\1.57.0"
set "PATH=%NODE_DIR%;%PATH%"
REM Create a node.cmd shim in a temp dir so tools that invoke "node" can find it
set "SHIM_DIR=%TEMP%\node-shim"
if not exist "%SHIM_DIR%" mkdir "%SHIM_DIR%"
(echo @echo off & echo "%NODE_EXE%" %%*) > "%SHIM_DIR%\node.cmd"
set "PATH=%SHIM_DIR%;%PATH%"
cd /d "%~dp0"
"%TEMP%\pnpm.exe" dev --port 5173
