@echo off
chcp 65001
cls

echo === 激活码生成工具 ===
echo.
echo 请选择激活码有效期:
echo.
echo [1] 一个月
echo [2] 一个季度
echo [3] 一年
echo.
set /p choice=请输入数字(1-3)，直接回车默认一个月:

if "%choice%"=="" set choice=1
if "%choice%"=="1" set duration=month
if "%choice%"=="2" set duration=quarter
if "%choice%"=="3" set duration=year

node keygen.js %duration%
echo.
pause 