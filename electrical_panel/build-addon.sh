#!/bin/bash

# Build script for Electrical Panel Mapper Home Assistant Add-on

set -e

echo "🔌 Building Electrical Panel Mapper Home Assistant Add-on..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="local/electrical-panel-mapper"
CONTAINER_NAME="electrical-panel-test"
TEST_PORT="8080"

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Clean up any existing test container
cleanup() {
    if docker ps -a --format 'table {{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        print_status "Stopping and removing existing test container..."
        docker stop $CONTAINER_NAME >/dev/null 2>&1 || true
        docker rm $CONTAINER_NAME >/dev/null 2>&1 || true
    fi
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed or not in PATH"
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker daemon is not running"
        exit 1
    fi
    
    print_status "Docker is ready"
}

# Build the Docker image
build_image() {
    print_status "Building Docker image: $IMAGE_NAME"
    echo ""
    
    # Remove existing image if it exists
    if docker images --format 'table {{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:latest$"; then
        print_warning "Removing existing image..."
        docker rmi $IMAGE_NAME:latest
    fi
    
    # Build the image
    docker build -t $IMAGE_NAME . --progress=plain
    
    if [ $? -eq 0 ]; then
        print_status "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
}

# Test the container locally
test_container() {
    print_status "Testing container locally..."
    
    # Create test data directory
    TEST_DATA_DIR="$(pwd)/test-data"
    mkdir -p "$TEST_DATA_DIR"
    
    # Run the container
    print_status "Starting test container on port $TEST_PORT..."
    docker run -d \
        --name $CONTAINER_NAME \
        -p $TEST_PORT:8080 \
        -v "$TEST_DATA_DIR:/data" \
        -e DATABASE_PATH="/data/database.db" \
        $IMAGE_NAME
    
    if [ $? -eq 0 ]; then
        print_status "Container started successfully"
        
        # Wait for the application to start
        print_status "Waiting for application to start..."
        sleep 5
        
        # Test if the application is responding
        if curl -f -s "http://localhost:$TEST_PORT" >/dev/null; then
            print_status "Application is responding!"
            echo ""
            echo "🎉 SUCCESS! Your add-on is ready for Home Assistant installation."
            echo ""
            echo "📱 Test the application:"
            echo "   Web UI: http://localhost:$TEST_PORT"
            echo ""
            echo "📁 Test data location: $TEST_DATA_DIR"
            echo ""
            echo "🛑 To stop test container:"
            echo "   docker stop $CONTAINER_NAME"
            echo "   docker rm $CONTAINER_NAME"
            echo ""
            echo "📦 To install in Home Assistant:"
            echo "   1. Copy this folder to /usr/share/hassio/addons/local/"
            echo "   2. Go to Supervisor > Add-on Store > Local Add-ons"
            echo "   3. Install 'Electrical Panel Mapper'"
            echo ""
        else
            print_error "Application is not responding on port $TEST_PORT"
            print_status "Checking container logs:"
            docker logs $CONTAINER_NAME
            exit 1
        fi
    else
        print_error "Failed to start container"
        exit 1
    fi
}

# Show image information
show_info() {
    print_status "Image information:"
    docker images $IMAGE_NAME --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
    echo ""
    
    print_status "Container information:"
    docker ps --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
}

# Main execution
main() {
    echo "Starting build process..."
    echo ""
    
    cleanup
    check_prerequisites
    build_image
    test_container
    show_info
    
    echo ""
    print_status "Build and test completed successfully!"
}

# Handle script arguments
case "${1:-build}" in
    "build")
        main
        ;;
    "test")
        test_container
        ;;
    "clean")
        cleanup
        print_status "Cleanup completed"
        ;;
    "info")
        show_info
        ;;
    *)
        echo "Usage: $0 [build|test|clean|info]"
        echo "  build  - Build and test the add-on (default)"
        echo "  test   - Test existing container"
        echo "  clean  - Clean up test containers"
        echo "  info   - Show image and container information"
        exit 1
        ;;
esac 