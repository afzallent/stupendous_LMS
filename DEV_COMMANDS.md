# Development Server Commands

Quick reference for managing CourseCompass LMS development servers.

## PowerShell Scripts

### Start Servers
```powershell
.\start-dev.ps1
```
Starts both Django (port 8000) and Astro (port 4321) servers in separate windows.

### Stop Servers
```powershell
.\stop-dev.ps1
```
Stops all running Django and Astro server processes.

### Check Status
```powershell
.\check-dev.ps1
```
Shows status of both servers, including:
- Running/stopped status
- Process IDs
- HTTP connectivity
- Port usage

### Restart Servers
```powershell
.\restart-dev.ps1
```
Stops and restarts both servers.

---

## Manual Commands

### Django Backend

**Start:**
```powershell
cd backend
python manage.py runserver
```

**Stop:**
Press `Ctrl+C` in the terminal

**Access:**
- API: http://localhost:8000/api/
- Admin: http://localhost:8000/admin/

### Astro Frontend

**Start:**
```powershell
cd frontend-astro
npm run dev
```

**Stop:**
Press `Ctrl+C` in the terminal

**Access:**
- Frontend: http://localhost:4321

---

## Common Tasks

### Check if servers are running
```powershell
.\check-dev.ps1
```

### Kill stuck processes
```powershell
# Kill Django
Get-Process python | Where-Object {$_.CommandLine -like "*manage.py*"} | Stop-Process -Force

# Kill Astro
Get-Process node | Where-Object {$_.CommandLine -like "*astro*"} | Stop-Process -Force
```

### Check port usage
```powershell
# Check port 8000 (Django)
Get-NetTCPConnection -LocalPort 8000

# Check port 4321 (Astro)
Get-NetTCPConnection -LocalPort 4321
```

---

## Troubleshooting

### Port already in use
If you get "port already in use" errors:
1. Run `.\stop-dev.ps1` to stop all servers
2. Wait 5 seconds
3. Run `.\start-dev.ps1` again

### Django migrations needed
```powershell
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Astro dependencies out of date
```powershell
cd frontend-astro
npm install
```

### Clear Django cache
```powershell
cd backend
python manage.py clearsessions
```

---

## Development Workflow

1. **Start development:**
   ```powershell
   .\start-dev.ps1
   ```

2. **Check status:**
   ```powershell
   .\check-dev.ps1
   ```

3. **Make changes to code** (servers auto-reload)

4. **Stop when done:**
   ```powershell
   .\stop-dev.ps1
   ```

---

## Quick Links

- **Django Admin:** http://localhost:8000/admin/
- **API Docs:** http://localhost:8000/api/
- **Astro Frontend:** http://localhost:4321
- **Student Login:** http://localhost:4321/login/student
- **Instructor Login:** http://localhost:4321/login/trainer
- **Student Dashboard:** http://localhost:4321/dashboard/student
- **Courses:** http://localhost:4321/courses

---

## Environment Setup

### First Time Setup

1. **Backend:**
   ```powershell
   cd backend
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   ```

2. **Frontend:**
   ```powershell
   cd frontend-astro
   npm install
   cp .env.example .env
   ```

3. **Start servers:**
   ```powershell
   .\start-dev.ps1
   ```

---

## Notes

- Django runs on port **8000**
- Astro runs on port **4321**
- Both servers support hot-reload
- Scripts work on Windows PowerShell
- Servers run in separate terminal windows for easy monitoring
