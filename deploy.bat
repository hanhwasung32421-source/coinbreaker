@echo off
cd /d C:\trae\coinbreaker
git remote set-url origin https://github.com/hanhwasung32421-source/coinbreaker.git
git branch -M main
git add -A
git commit -m "update"
git push -u origin main

