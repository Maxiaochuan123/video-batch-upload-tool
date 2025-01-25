@echo off
chcp 65001
cls

echo === 清除授权信息 ===
echo.
echo 此操作将清除当前的授权信息，软件需要重新激活。
echo.
echo [1] 确定清除
echo [2] 取消操作
echo.
set /p choice=请输入数字(1/2)，直接回车取消:

if "%choice%"=="1" (
    del /f /q "%APPDATA%\video-batch-upload-tool\license.json" 2>nul
    if %errorlevel% equ 0 (
        echo.
        echo 授权信息已清除！
        echo 请重启软件以重新激活。
    ) else (
        echo.
        echo 未找到授权信息或已经清除。
    )
) else (
    echo.
    echo 已取消操作。
)

echo.
pause 