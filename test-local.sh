#!/bin/bash

# Local testing script for Electrical Panel Mapper Add-on

set -e

echo "🔌 Testing Electrical Panel Mapper locally..."
echo ""

# Configuration
IMAGE_NAME="electrical-panel-test"
CONTAINER_NAME="electrical-panel-local"
TEST_PORT="8080"
TEST_DATA_DIR="./test-data"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Clean up any existing container
cleanup() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_status "Stopping existing container..."
        docker stop $CONTAINER_NAME >/dev/null 2>&1 || true
        docker rm $CONTAINER_NAME >/dev/null 2>&1 || true
    fi
}

# Build the image
build_image() {
    print_status "Building Docker image..."
    cd electrical_panel
    docker build -t $IMAGE_NAME .
    cd ..
    print_status "Build completed successfully!"
}

# Test the container
test_container() {
    print_status "Starting test container..."
    
    # Create test data directory
    mkdir -p "$TEST_DATA_DIR"
    
    # Run the container
    docker run -d \
        --name $CONTAINER_NAME \
        -p $TEST_PORT:8080 \
        -v "$(pwd)/$TEST_DATA_DIR:/data" \
        -e DATABASE_PATH="/data/database.db" \
        $IMAGE_NAME
    
    print_status "Container started, waiting for application..."
    sleep 5
    
    # Test if application is responding
    if curl -f -s "http://localhost:$TEST_PORT" >/dev/null; then
        print_status "✨ SUCCESS! Application is running!"
        echo ""
        echo "🌐 Access your app: http://localhost:$TEST_PORT"
        echo "📁 Database location: $TEST_DATA_DIR/database.db"
        echo ""
        echo "🛑 To stop: ./test-local.sh stop"
        echo "🔍 View logs: docker logs $CONTAINER_NAME"
    else
        print_error "Application failed to start"
        echo ""
        print_status "Container logs:"
        docker logs $CONTAINER_NAME
        exit 1
    fi
}

# Show logs
show_logs() {
    if docker ps --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        docker logs -f $CONTAINER_NAME
    else
        print_error "Container is not running"
    fi
}

# Stop and clean up
stop_container() {
    cleanup
    print_status "Container stopped and removed"
}

# Main execution
case "${1:-build}" in
    "build")
        cleanup
        build_image
        test_container
        ;;
    "test")
        cleanup
        test_container
        ;;
    "stop")
        stop_container
        ;;
    "logs")
        show_logs
        ;;
    "rebuild")
        cleanup
        docker rmi $IMAGE_NAME 2>/dev/null || true
        build_image
        test_container
        ;;
    *)
        echo "Usage: $0 [build|test|stop|logs|rebuild]"
        echo "  build   - Build and test (default)"
        echo "  test    - Test existing image"
        echo "  stop    - Stop and remove container"
        echo "  logs    - View container logs"
        echo "  rebuild - Force rebuild and test"
        exit 1
        ;;
esac 