#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                            ║${NC}"
echo -e "${BLUE}║     🌱 Lesson & Module Seed Scripts       ║${NC}"
echo -e "${BLUE}║                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Select an option:${NC}"
echo ""
echo "  1. 🚀 Quick Demo Seed (1 course, 3 modules, 8 lessons)"
echo "  2. 📚 Full Seed (5 courses, 30 modules, 150+ lessons)"
echo "  3. 🗑️  Clear All Lesson Data"
echo "  4. 📖 View Documentation"
echo "  5. ❌ Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
  1)
    echo -e "\n${GREEN}Running Quick Demo Seed...${NC}\n"
    npm run seed:quick-demo
    ;;
  2)
    echo -e "\n${GREEN}Running Full Seed (this may take 2-3 minutes)...${NC}\n"
    npm run seed:lessons-modules
    ;;
  3)
    echo -e "\n${RED}⚠️  WARNING: This will delete all courses, modules, and lessons!${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
      echo -e "${YELLOW}Clearing data...${NC}"
      mongosh --eval "use lms_database; db.courses.deleteMany({}); db.coursemodules.deleteMany({}); db.lessons.deleteMany({}); print('✓ Data cleared successfully!');"
    else
      echo -e "${GREEN}Cancelled.${NC}"
    fi
    ;;
  4)
    echo -e "\n${BLUE}Opening documentation...${NC}\n"
    cat scripts/README-SEED.md
    ;;
  5)
    echo -e "\n${GREEN}Goodbye!${NC}\n"
    exit 0
    ;;
  *)
    echo -e "\n${RED}Invalid option!${NC}\n"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✅ Done!${NC}"
echo ""
