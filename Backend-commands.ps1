cd "C:\Users\Parker\Downloads\PROJECTS\parkr\backend"
Write-Host "Starting Backend server..." -ForegroundColor Green
cd backend
.\venv\scripts\activate
python manage.py runserver
