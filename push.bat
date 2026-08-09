@echo off
echo ============================================
echo  ReGenX - Git Push to GitHub
echo ============================================
cd /d "C:\Users\shrut\OneDrive\Desktop\ReGenX"

echo.
echo [1/4] Staging all changes...
git add -A

echo.
echo [2/4] Current status:
git status

echo.
echo [3/4] Committing...
git commit -m "feat: Add optimised IoT Sensory Bin dashboard with live simulation engine"

echo.
echo [4/4] Pushing to GitHub (main branch)...
git push origin main

echo.
echo ============================================
echo  Done! Check GitHub to confirm the push.
echo ============================================
pause
