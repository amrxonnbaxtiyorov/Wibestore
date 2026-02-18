"""
WibeStore Backend - Settings module.
"""

import os

env = os.environ.get("DJANGO_SETTINGS_MODULE", "config.settings.development")
