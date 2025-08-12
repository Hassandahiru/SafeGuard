#!/bin/bash

# SafeGuard Database Setup Script
# This script sets up the complete SafeGuard database schema including all functions

echo "SafeGuard Database Setup"
echo "======================="

# Check if database name is provided
if [ -z "$1" ]; then
    echo "Usage: $0 <database_name> [username] [host] [port]"
    echo "Example: $0 safeguard_db postgres localhost 5432"
    exit 1
fi

DB_NAME=$1
DB_USER=${2:-postgres}
DB_HOST=${3:-localhost}
DB_PORT=${4:-5432}

echo "Database: $DB_NAME"
echo "User: $DB_USER"
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo ""

# Check if database exists
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "Database '$DB_NAME' exists."
    read -p "Do you want to run the schema setup on existing database? (y/N): " confirm
    if [[ ! $confirm =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
else
    echo "Creating database '$DB_NAME'..."
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    if [ $? -ne 0 ]; then
        echo "Failed to create database. Please check your permissions."
        exit 1
    fi
fi

echo ""
echo "Setting up SafeGuard schema..."
echo "==============================="

# Run the main DDL script
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f database/safe-guard-ddl.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database schema setup completed successfully!"
    echo ""
    echo "Verifying key functions..."
    echo "=========================="
    
    # Test if the create_visit_with_visitors function exists
    FUNCTION_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'create_visit_with_visitors';")
    
    if [ "$FUNCTION_EXISTS" -eq 1 ]; then
        echo "✅ create_visit_with_visitors function: FOUND"
    else
        echo "❌ create_visit_with_visitors function: MISSING"
    fi
    
    # Test if tables exist
    TABLES=("buildings" "users" "visits" "visitors" "visit_visitors" "visitor_bans")
    
    for table in "${TABLES[@]}"; do
        TABLE_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';")
        if [ "$TABLE_EXISTS" -eq 1 ]; then
            echo "✅ Table $table: FOUND"
        else
            echo "❌ Table $table: MISSING"
        fi
    done
    
    echo ""
    echo "🎉 Setup complete! You can now start your SafeGuard application."
    echo ""
    echo "Next steps:"
    echo "1. Update your .env file with the database connection string"
    echo "2. Start the SafeGuard backend: npm start"
    echo "3. Test the visitor invitation API"
    
else
    echo ""
    echo "❌ Database schema setup failed!"
    echo "Please check the error messages above and fix any issues."
    exit 1
fi