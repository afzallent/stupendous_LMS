# Server Management Scripts

PowerShell scripts to manage the LMS development servers (Django backend + Next.js frontend).

## Prerequisites

- Python virtual environment set up at `venv/`
- Node.js and npm installed
- PowerShell 7+ (recommended) or Windows PowerShell

## Scripts

### 🚀 Start Servers

Starts both Django backend (port 8000) and Next.js frontend (port 3000) in background jobs.

```powershell
.\start-servers.ps1
```

**What it does:**
- Starts Django development server on http://localhost:8000
- Starts Next.js development server on http://localhost:3000
- Runs both servers in background PowerShell jobs
- Saves job IDs to `.server-jobs.json` for easy stopping
- Monitors server status

**Output:**
- Server URLs and job IDs
- Helpful commands for managing servers

---

### 🛑 Stop Servers

Stops all running LMS servers (both Django and Next.js).

```powershell
.\stop-servers.ps1
```

**What it does:**
- Reads job IDs from `.server-jobs.json`
- Stops and removes background jobs
- Kills processes on ports 3000 and 8000 (fallback)
- Cleans up job tracking file

---

### 🔄 Restart Servers

Stops and then starts both servers.

```powershell
.\restart-servers.ps1
```

**What it does:**
- Runs `stop-servers.ps1`
- Waits 2 seconds
- Runs `start-servers.ps1`

---

### 🔍 Check Server Status

Checks if servers are running and responding.

```powershell
.\check-servers.ps1
```

**What it does:**
- Checks if ports 3000 and 8000 are in use
- Shows process IDs and names
- Tests if servers are responding to HTTP requests
- Lists background PowerShell jobs
- Displays server URLs

---

## Usage Examples

### Start development environment
```powershell
# Start both servers
.\start-servers.ps1

# Check status
.\check-servers.ps1
```

### View server logs
```powershell
# View all job output
Get-Job | Receive-Job

# View specific job output
Receive-Job -Id 1  # Replace 1 with actual job ID
```

### Stop development environment
```powershell
# Stop all servers
.\stop-servers.ps1

# Verify they're stopped
.\check-servers.ps1
```

### Restart after code changes
```powershell
# Quick restart
.\restart-servers.ps1
```

## Troubleshooting

### Servers won't start

**Check if ports are already in use:**
```powershell
Get-NetTCPConnection -LocalPort 3000, 8000
```

**Kill processes manually:**
```powershell
# Find process on port 8000
$pid = (Get-NetTCPConnection -LocalPort 8000).OwningProcess
Stop-Process -Id $pid -Force

# Find process on port 3000
$pid = (Get-NetTCPConnection -LocalPort 3000).OwningProcess
Stop-Process -Id $pid -Force
```

### Jobs are stuck

**List all jobs:**
```powershell
Get-Job
```

**Force remove all jobs:**
```powershell
Get-Job | Stop-Job
Get-Job | Remove-Job -Force
```

### Virtual environment not found

**Create virtual environment:**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r backend\requirements.txt
```

### Node modules not installed

**Install dependencies:**
```powershell
cd frontend
npm install
cd ..
```

## Server URLs

Once started, access the application at:

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **Django Admin:** http://localhost:8000/admin
- **API Documentation:** http://localhost:8000/api/

## Notes

- Servers run in background PowerShell jobs
- Job IDs are saved to `.server-jobs.json`
- Logs are captured by PowerShell jobs (use `Receive-Job` to view)
- Django auto-reloads on code changes
- Next.js has Fast Refresh for React components
- Use `Ctrl+C` to stop monitoring (servers continue running)

## Manual Server Management

If you prefer to run servers manually:

### Django Backend
```powershell
cd backend
..\venv\Scripts\python.exe manage.py runserver
```

### Next.js Frontend
```powershell
cd frontend
npm run dev
```

## File Structure

```
.
├── start-servers.ps1      # Start both servers
├── stop-servers.ps1       # Stop both servers
├── restart-servers.ps1    # Restart both servers
├── check-servers.ps1      # Check server status
├── .server-jobs.json      # Job IDs (auto-generated)
├── backend/               # Django backend
│   └── manage.py
├── frontend/              # Next.js frontend
│   └── package.json
└── venv/                  # Python virtual environment
```
