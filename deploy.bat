@echo off
REM New Prachi Medical APP - Automatic GitHub Deploy Script
REM Just double-click this file to deploy everything!

echo.
echo ====================================================
echo   NEW PRACHI MEDICAL APP - GITHUB DEPLOY
echo ====================================================
echo.

REM Set git config
echo Step 1: Setting git config...
git config --global user.email "prachi@presenticai.com"
git config --global user.name "Prachi Dev"
echo Done!
echo.

REM Initialize git
echo Step 2: Initializing git repository...
git init
echo Done!
echo.

REM Add all files
echo Step 3: Adding all files...
git add .
echo Done!
echo.

REM Create commit
echo Step 4: Creating commit...
git commit -m "Initial commit - New Prachi Medical APP"
echo Done!
echo.

REM Rename branch to main
echo Step 5: Setting branch to main...
git branch -M main
echo Done!
echo.

REM Add remote
echo Step 6: Connecting to GitHub...
git remote add origin https://github.com/dev2-presenticai/New-Prachi-APP.git
echo Done!
echo.

REM Push to GitHub
echo Step 7: Pushing to GitHub (this may take 30 seconds)...
git push -u origin main

echo.
echo ====================================================
echo   ✅ DEPLOYMENT COMPLETE!
echo ====================================================
echo.
echo Your app is now on GitHub!
echo Next step: Connect to Cloudflare Pages
echo.
pause
