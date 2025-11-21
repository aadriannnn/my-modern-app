#!/bin/bash
set -e

echo "============================================"
echo "🚀 Starting Lege Aplicata Backend"
echo "============================================"

# ============================================
# Environment Validation
# ============================================
echo "📋 Validating environment variables..."

REQUIRED_VARS=(
    "DATABASE_URL"
    "DATABASE_CODURI_URL"
    "DATABASE_MODELE_URL"
    "CORS_ORIGINS"
    "USER_SETARI"
    "PASS_SETARI"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo "❌ ERROR: Missing required environment variables:"
    printf '   - %s\n' "${MISSING_VARS[@]}"
    echo ""
    echo "Please set these variables in your .env file or Coolify environment settings."
    exit 1
fi

echo "✅ All required environment variables are set"

# ============================================
# Database Connection Check
# ============================================
echo ""
echo "🔌 Checking database connectivity..."

# Function to check if PostgreSQL is ready
check_postgres() {
    local db_url=$1
    local max_attempts=30
    local attempt=1

    # Extract host and port from DATABASE_URL
    # Format: postgresql://user:pass@host:port/db
    local host_port=$(echo "$db_url" | sed -E 's|postgresql://[^@]+@([^/]+)/.*|\1|')
    local host=$(echo "$host_port" | cut -d: -f1)
    local port=$(echo "$host_port" | cut -d: -f2)

    if [ -z "$port" ]; then
        port=5432
    fi

    echo "   Waiting for PostgreSQL at $host:$port..."

    while [ $attempt -le $max_attempts ]; do
        if timeout 2 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null; then
            echo "   ✅ PostgreSQL is ready!"
            return 0
        fi
        echo "   ⏳ Attempt $attempt/$max_attempts - PostgreSQL not ready yet..."
        sleep 2
        attempt=$((attempt + 1))
    done

    echo "   ❌ ERROR: Could not connect to PostgreSQL after $max_attempts attempts"
    return 1
}

# Check main database
if ! check_postgres "$DATABASE_URL"; then
    exit 1
fi

echo "✅ Database connections verified"

# ============================================
# Create logs directory if it doesn't exist
# ============================================
mkdir -p /app/logs

# ============================================
# Application Startup
# ============================================
echo ""
echo "🎯 Starting FastAPI application..."
echo "   Environment: ${ENVIRONMENT:-production}"
echo "   Workers: ${WORKERS:-4}"
echo "   Timeout: ${TIMEOUT:-60}s"
echo "   Log Level: ${LOG_LEVEL:-INFO}"
echo ""
echo "============================================"

# Start the application with Gunicorn (production) or Uvicorn (development)
if [ "$ENVIRONMENT" = "development" ]; then
    echo "🔧 Development mode - using Uvicorn with reload"
    exec uvicorn app.main:app \
        --host 0.0.0.0 \
        --port 8000 \
        --reload \
        --log-level ${LOG_LEVEL:-info}
else
    echo "🚀 Production mode - using Gunicorn with Uvicorn workers"
    exec gunicorn app.main:app \
        --workers ${WORKERS:-4} \
        --worker-class uvicorn.workers.UvicornWorker \
        --bind 0.0.0.0:8000 \
        --timeout ${TIMEOUT:-60} \
        --access-logfile - \
        --error-logfile - \
        --log-level ${LOG_LEVEL:-info} \
        --graceful-timeout 30 \
        --keep-alive 5
fi
