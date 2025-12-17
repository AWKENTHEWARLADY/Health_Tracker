@echo off
echo 🏥 Creating Health Tracker Application...
cd /d "C:\Users\MOKOENA KWENA"
mkdir health_tracker
cd health-tracker
mkdir public
mkdir public\css
mkdir public\js
mkdir database

echo Creating files...
type nul > package.json
type nul > server.js
type nul > public\index.html
type nul > public\login.html
type nul > public\dashboard.html
type nul > public\css\style.css
type nul > public\js\auth.js
type nul > public\js\dashboard.js

echo ✅ Project structure created successfully!
echo 📁 Location: C:\Users\MOKOENA KWENA\health_tracker
echo.
echo 🎯 Next steps:
echo    1. Copy code into each file
echo    2. Run: npm install
echo    3. Run: npm start
pause