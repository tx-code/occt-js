@echo off
call %~dp0build_wasm_win.bat Release
exit /b %errorlevel%
