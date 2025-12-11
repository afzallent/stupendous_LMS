#!/bin/bash
# Interactive script to stop development servers

echo -e "\033[0;36m=== LMS Development Server Stopper ===\033[0m"
echo ""

# Check which ports are in use
declare -a running_servers=()
declare -a server_pids=()
declare -a server_names=()

# Check Django (port 8000)
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    pid=$(lsof -Pi :8000 -sTCP:LISTEN -t)
    running_servers+=("Django Backend - Port 8000 (PID: $pid)")
    server_pids+=("$pid")
    server_names+=("Django Backend")
fi

# Check Next.js (port 4000)
if lsof -Pi :4000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    pid=$(lsof -Pi :4000 -sTCP:LISTEN -t)
    running_servers+=("Next.js Frontend - Port 4000 (PID: $pid)")
    server_pids+=("$pid")
    server_names+=("Next.js Frontend")
fi

# Check Astro (port 4321)
if lsof -Pi :4321 -sTCP:LISTEN -t >/dev/null 2>&1; then
    pid=$(lsof -Pi :4321 -sTCP:LISTEN -t)
    running_servers+=("Astro Frontend - Port 4321 (PID: $pid)")
    server_pids+=("$pid")
    server_names+=("Astro Frontend")
fi

if [ ${#running_servers[@]} -eq 0 ]; then
    echo -e "\033[0;37mNo development servers are currently running.\033[0m"
    echo ""
    exit 0
fi

# Display running servers
echo -e "\033[0;33mRunning servers:\033[0m"
for i in "${!running_servers[@]}"; do
    echo "  $((i+1)). ${running_servers[$i]}"
done
echo "  $((${#running_servers[@]}+1)). Stop ALL servers"
echo "  0. Cancel"
echo ""

read -p "Enter your choice: " choice

if [ "$choice" = "0" ]; then
    echo -e "\033[0;37mCancelled.\033[0m"
    exit 0
fi

declare -a pids_to_stop=()
declare -a names_to_stop=()

if [ "$choice" = "$((${#running_servers[@]}+1))" ]; then
    # Stop all servers
    pids_to_stop=("${server_pids[@]}")
    names_to_stop=("${server_names[@]}")
    echo ""
    echo -e "\033[0;33mStopping all servers...\033[0m"
elif [ "$choice" -ge 1 ] && [ "$choice" -le "${#running_servers[@]}" ]; then
    # Stop specific server
    idx=$((choice-1))
    pids_to_stop=("${server_pids[$idx]}")
    names_to_stop=("${server_names[$idx]}")
    echo ""
    echo -e "\033[0;33mStopping ${server_names[$idx]}...\033[0m"
else
    echo -e "\033[0;31mInvalid choice. Exiting.\033[0m"
    exit 1
fi

echo ""

# Stop processes
for i in "${!pids_to_stop[@]}"; do
    pid="${pids_to_stop[$i]}"
    name="${names_to_stop[$i]}"
    
    echo -e "\033[0;33mKilling $name (PID: $pid)...\033[0m"
    
    # Kill process and its children
    pkill -P "$pid" 2>/dev/null
    kill "$pid" 2>/dev/null
    sleep 1
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        kill -9 "$pid" 2>/dev/null
    fi
    
    echo -e "  \033[0;32m$name stopped successfully\033[0m"
done

# If stopping all, clean up PID file and any remaining node processes
if [ "$choice" = "$((${#running_servers[@]}+1))" ]; then
    echo ""
    echo -e "\033[0;33mCleaning up any remaining node processes...\033[0m"
    pkill -f "node.*dev" 2>/dev/null
    
    # Remove PID file if exists
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    rm -f "$SCRIPT_DIR/.dev-pids.txt" 2>/dev/null
fi

echo ""
echo -e "\033[0;32mDone!\033[0m"
echo ""
