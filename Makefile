# TaskTimeFlow Docker Commands

.PHONY: help build dev prod down clean logs shell

# Default target
help:
	@echo "TaskTimeFlow Docker Commands:"
	@echo "  make build    - Build all Docker images"
	@echo "  make dev      - Start development environment"
	@echo "  make prod     - Start production environment"
	@echo "  make down     - Stop all services"
	@echo "  make clean    - Remove all containers, images, and volumes"
	@echo "  make logs     - Show logs for all services"
	@echo "  make shell    - Open shell in web container"
	@echo ""

# Build all images
build:
	docker-compose build

# Development environment
dev:
	docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Production environment
prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Stop all services
down:
	docker-compose down

# Clean up everything
clean:
	docker-compose down -v --rmi all --remove-orphans
	docker system prune -af

# Show logs
logs:
	docker-compose logs -f

# Open shell in web container
shell:
	docker-compose exec web sh

# Show status
status:
	docker-compose ps

# Restart specific service
restart-web:
	docker-compose restart web

restart-api:
	docker-compose restart api

restart-nginx:
	docker-compose restart nginx

# Database operations
db-migrate:
	cd supabase && supabase db push

db-reset:
	cd supabase && supabase db reset

# Install dependencies
install:
	npm install

# Run tests
test:
	docker-compose exec web npm run test
	docker-compose exec api npm run test

# Run linting
lint:
	docker-compose exec web npm run lint
	docker-compose exec api npm run lint