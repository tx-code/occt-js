@echo off
REM ---------------------------------------------------------------------------
REM  Install and activate Emscripten SDK on Windows
REM  Run this script once before building.
REM ---------------------------------------------------------------------------

cd /d %~dp0\..

if not exist emsdk (
    echo === Cloning Emscripten SDK ===
    git clone https://github.com/emscripten-core/emsdk.git
)

cd emsdk

echo === Installing Emscripten 3.1.69 ===
call emsdk install 3.1.69

echo === Activating Emscripten 3.1.69 ===
call emsdk activate 3.1.69

echo.
echo === Done ===
echo To use emcmake/emmake in this shell, run:
echo   call emsdk\emsdk_env.bat
echo.
