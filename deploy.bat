@echo off
cd /d C:\trae\coinbreaker
if exist ".git\index.lock" del /f ".git\index.lock"
git remote set-url origin https://github.com/hanhwasung32421-source/coinbreaker.git
git branch -M main
git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "update"
  git push -u origin main
) else (
  echo no changes to commit
)
