#!/bin/bash
# Interactive script to start development servers

echo -e "\033[0;36m=== LMS Development Server Starter ===\033[0m"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Ask which servers to start
echo -e "\033[0;33mWhich server(s) would you like to start?\033[0m"
echo "  1. Django backend only (port 8000)"
echo "  2. Next.js frontend only (port 4000)"
echo "  3. Astro frontend only (port 4321)"
echo "  4. Django + Next.js"
echo "  5. Django + Astro"
echo "  6. All servers (Django + Next.js + Astro)"
echo ""
read -p "Enter your choice (1-6): " choice

start_django=false
start_nextjs=false
start_astro=false

case $choice in
    1) start_django=true ;;
    2) start_nextjs=true ;;
    3) start_astro=true ;;
    4) start_django=true; start_nextjs=true ;;
    5) start_django=true; start_astro=true ;;
    6) start_django=true; start_nextjs=true; start_astro=true ;;
    *)
        echo -e "\033[0;31mInvalid choice. Exiting.\033[0m"
        exit 1
        ;;
esac

echo ""
echo -e "\033[0;32mStarting servers...\033[0m"
echo ""

# Create PID file to track processes
PID_FILE="$SCRIPT_DIR/.dev-pids.txt"
> "$PID_FILE"

# Start Django backend
if [ "$start_django" = true ]; then
    if [ ! -f "$SCRIPT_DIR/venv/bin/python" ]; then
        echo -e "\033[0;31mVirtual environment not found!\033[0m"
        echo -e "\033[0;33mPlease create it first: python -m venv venv\033[0m"
        exit 1
    fi
    
    echo -e "\033[0;32mStarting Django backend (port 8000)...\033[0m"
    cd "$SCRIPT_DIR"
    nohup venv/bin/python backend/manage.py runserver > /dev/null 2>&1 &
    django_pid=$!
    echo "django:$django_pid" >> "$PID_FILE"
    sleep 2
fi

# Start Next.js frontend
if [ "$start_nextjs" = true ]; then
    if [ ! -f "$SCRIPT_DIR/frontend/package.json" ]; then
        echo -e "\033[0;31mNext.js frontend not found!\033[0m"
        exit 1
    fi
    
    echo -e "\033[0;32mStarting Next.js frontend (port 4000)...\033[0m"
    cd "$SCRIPT_DIR/frontend"
    nohup npm run dev > /dev/null 2>&1 &
    nextjs_pid=$!
    echo "nextjs:$nextjs_pid" >> "$PID_FILE"
    sleep 2
fi

# Start Astro frontend
if [ "$start_astro" = true ]; then
    if [ ! -f "$SCRIPT_DIR/frontend-astro/package.json" ]; then
        echo -e "\033[0;31mAstro frontend not found!\033[0m"
        exit 1
    fi
    
    echo -e "\033[0;32mStarting Astro frontend (port 4321)...\033[0m"
    cd "$SCRIPT_DIR/frontend-astro"
    nohup npm run dev > /dev/null 2>&1 &
    astro_pid=$!
    echo "astro:$astro_pid" >> "$PID_FILE"
    sleep 2
fi

cd "$SCRIPT_DIR"

echo ""
echo -e "\033[0;32mServers started successfully!\033[0m"
echo ""
echo -e "\033[0;36mServer URLs:\033[0m"

if [ "$start_django" = true ]; then
    echo -e "   - Django: http://localhost:8000 (PID: $django_pid)"
    echo -e "   - Admin: http://localhost:8000/admin"
fi
if [ "$start_nextjs" = true ]; then
    echo -e "   - Next.js: http://localhost:4000 (PID: $nextjs_pid)"
fi
if [ "$start_astro" = true ]; then
    echo -e "   - Astro: http://localhost:4321 (PID: $astro_pid)"
fi

echo ""
echo -e "\033[0;33mTo check server status, run: ./check-dev.sh\033[0m"
echo -e "\033[0;33mTo stop servers, run: ./stop-dev.sh\033[0m"
echo ""
