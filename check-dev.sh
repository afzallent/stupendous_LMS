#!/bin/bash
# Check the status of development servers

echo -e "\033[0;36m=== LMS Development Server Status ===\033[0m"
echo ""

# Define servers
declare -A servers=(
    ["Django Backend"]="8000:http://localhost:8000"
    ["Next.js Frontend"]="4000:http://localhost:4000"
    ["Astro Frontend"]="4321:http://localhost:4321"
)

running_count=0

for name in "Django Backend" "Next.js Frontend" "Astro Frontend"; do
    IFS=':' read -r port url <<< "${servers[$name]}"
    
    echo -e "\033[0;33m$name - port $port:\033[0m"
    
    # Check if port is in use
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        pid=$(lsof -Pi :$port -sTCP:LISTEN -t)
        process=$(ps -p $pid -o comm= 2>/dev/null)
        
        echo -e "  Status: \033[0;32mRUNNING\033[0m"
        echo -e "  PID: $pid"
        echo -e "  Process: $process"
        
        # Try to check if it's responding
        if curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url" >/dev/null 2>&1; then
            status_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "$url")
            echo -e "  Health: \033[0;32mRESPONDING (Status: $status_code)\033[0m"
        else
            echo -e "  Health: \033[0;33mNOT RESPONDING\033[0m"
        fi
        
        ((running_count++))
    else
        echo -e "  Status: \033[0;31mNOT RUNNING\033[0m"
    fi
    echo ""
done

# Summary
echo -e "\033[0;36mSummary:\033[0m"
echo -e "  $running_count of ${#servers[@]} servers running"
echo ""

# Show URLs
echo -e "\033[0;36mServer URLs:\033[0m"
echo -e "   - Django Backend:  http://localhost:8000"
echo -e "   - Django Admin:    http://localhost:8000/admin"
echo -e "   - Next.js Frontend: http://localhost:4000"
echo -e "   - Astro Frontend:   http://localhost:4321"
echo ""
