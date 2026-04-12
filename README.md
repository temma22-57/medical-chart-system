Prerequisite Packages:
    -git
    -python3
    -python3-venv
    -python3-pip
    -node
    -npm

To verify packages:
    python3 --version
    python3 -m pip --version
    python3 -m venv --help
    node --version
    npm --version
    git --version

Recommended first-run command sequence:
(Terminal 1: Backend)
    git clone https://github.com/temma22-57/medical-chart-system.git
    cd medical-chart-system
    cd backend
    python3 -m venv .venv
    source .venv/bin/activate
    python3 -m pip install --upgrade pip
    python3 -m pip install django djangorestframework django-cors-headers psycopg2-binary
    python3 manage.py makemigrations
    python3 manage.py migrate
    python3 manage.py runserver
(Terminal 2: Frontend)
    cd ~/medical-chart-system/frontend
    npm install
    npm install axios
    npm run dev
(Browser)
    http://localhost:5173/

Re-running after initial setup:
(Terminal 1: Backend)
    cd ~/medical-chart-system/backend
    source .venv/bin/activate
    python3 manage.py runserver
(Terminal 2: Frontend) 
    cd ~/medical-chart-system/frontend
    npm run dev
(Browser)
    http://localhost:5173/
