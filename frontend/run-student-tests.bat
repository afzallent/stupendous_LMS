@echo off
echo.
echo ========================================
echo   Student Journey Tests - Headed Mode
echo ========================================
echo.
echo Starting tests with visible Chrome browser...
echo.

REM Create screenshots directory if it doesn't exist
if not exist "screenshots" mkdir screenshots

REM Set environment variable for headed mode
set JEST_PUPPETEER_CONFIG=tests/jest-puppeteer-headed.config.js

REM Run the tests
npx jest tests/student-journey.test.js --config=tests/jest.config.js --verbose

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo   All tests passed successfully!
    echo   Check screenshots folder for images
    echo ========================================
) else (
    echo.
    echo ========================================
    echo   Tests failed! Check output above.
    echo ========================================
)

pause