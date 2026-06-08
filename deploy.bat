@echo off
cd /d C:\trae\coinbreaker
if exist ".git\index.lock" del /f ".git\index.lock"
git remote set-url origin https://github.com/hanhwasung32421-source/coinbreaker.git

for /f %%b in ('git rev-parse --abbrev-ref HEAD') do set BRANCH=%%b
if "%BRANCH%"=="" (
  echo failed to detect current branch
  exit /b 1
)

git add -A
git diff --cached --quiet
if errorlevel 1 (
  git commit -m "update"
  git push -u origin %BRANCH%
) else (
  echo no changes to commit
)
