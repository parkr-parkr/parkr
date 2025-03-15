import os
import django
import sys

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

# Test the connection
from django.db import connections
from django.db.utils import OperationalError

try:
    conn = connections['default']
    conn.cursor()
    print("✅ Successfully connected to Neon PostgreSQL database!")
except OperationalError as e:
    print(f"❌ Database connection failed: {e}")