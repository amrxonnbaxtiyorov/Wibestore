"""
WibeStore Backend - Input Sanitization
XSS protection and data sanitization utilities.
"""

import re


def sanitize_text(text, allow_html=False):
    """Remove potentially dangerous HTML/JS from text."""
    if not text:
        return text
    if not allow_html:
        # Strip all HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Remove javascript: URLs
        text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
        # Remove on* event handlers
        text = re.sub(r'\bon\w+\s*=', '', text, flags=re.IGNORECASE)
    else:
        # Allow only safe tags
        allowed_tags = {'b', 'i', 'u', 'a', 'br', 'p', 'strong', 'em'}
        # Remove all tags except allowed
        def replace_tag(match):
            tag = match.group(1).lower().split()[0].strip('/')
            if tag in allowed_tags:
                return match.group(0)
            return ''
        text = re.sub(r'<(/?\w[^>]*)>', replace_tag, text)
        # Remove dangerous attributes
        text = re.sub(r'\bon\w+\s*=\s*["\'][^"\']*["\']', '', text, flags=re.IGNORECASE)
        text = re.sub(r'javascript:', '', text, flags=re.IGNORECASE)
    return text.strip()


def sanitize_json(data):
    """Recursively sanitize all string values in JSON data."""
    if isinstance(data, str):
        return sanitize_text(data)
    if isinstance(data, dict):
        return {k: sanitize_json(v) for k, v in data.items()}
    if isinstance(data, list):
        return [sanitize_json(item) for item in data]
    return data
