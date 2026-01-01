@echo off
setlocal EnableDelayedExpansion

:: Colors (Windows)
color 0A

:menu
cls
echo ╔════════════════════════════════════════════╗
echo ║                                            ║
echo ║     🌱 Lesson ^& Module Seed Scripts       ║
echo ║                                            ║
echo ╚════════════════════════════════════════════╝
echo.
echo Select an option:
echo.
echo   1. 🚀 Quick Demo Seed (1 course, 3 modules, 8 lessons)
echo   2. 📚 Full Seed (5 courses, 30 modules, 150+ lessons)
echo   3. 📖 View Documentation
echo   4. ❌ Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto quick_seed
if "%choice%"=="2" goto full_seed
if "%choice%"=="3" goto docs
if "%choice%"=="4" goto end

echo.
echo Invalid option!
pause
goto menu

:quick_seed
echo.
echo Running Quick Demo Seed...
echo.
call npm run seed:quick-demo
echo.
echo ✅ Done!
pause
goto menu

:full_seed
echo.
echo Running Full Seed (this may take 2-3 minutes)...
echo.
call npm run seed:lessons-modules
echo.
echo ✅ Done!
pause
goto menu

:docs
echo.
echo Opening documentation...
echo.
type scripts\README-SEED.md
echo.
pause
goto menu

:end
echo.
echo Goodbye!
echo.
exit /b 0
