import os
import json
import datetime
import uuid
import requests
import feedparser
from bs4 import BeautifulSoup
from flask import Flask, render_template, jsonify, request

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_FILE = "releases_cache.json"
CACHE_EXPIRY_SECONDS = 3600  # 1 hour default cache

def parse_release_notes(feed_content):
    """Parses the XML feed content using feedparser and BeautifulSoup."""
    feed = feedparser.parse(feed_content)
    all_updates = []
    
    for entry in feed.entries:
        # Standardize date representation
        date_str = entry.title
        iso_date = entry.get('updated', '')
        if iso_date:
            try:
                dt = datetime.datetime.fromisoformat(iso_date)
                formatted_date = dt.strftime('%B %d, %Y')
                sort_date = dt.date().isoformat()
            except Exception:
                formatted_date = date_str
                sort_date = date_str
        else:
            formatted_date = date_str
            sort_date = date_str
            
        summary_html = entry.get('summary', '') or entry.get('content', [{}])[0].get('value', '')
        if not summary_html:
            # Fallback if no HTML summary
            all_updates.append({
                'id': str(uuid.uuid5(uuid.NAMESPACE_DNS, entry.id + "_" + date_str)),
                'date': formatted_date,
                'sort_date': sort_date,
                'type': 'Announcement',
                'description': entry.title,
                'html_content': entry.title,
                'link': entry.link
            })
            continue
            
        soup = BeautifulSoup(summary_html, 'html.parser')
        
        current_type = None
        current_elements = []
        element_idx = 0
        
        for child in soup.contents:
            if child.name == 'h3':
                if current_type is not None or current_elements:
                    update_type = current_type or 'Announcement'
                    html_content = "".join(str(el) for el in current_elements).strip()
                    text_content = BeautifulSoup(html_content, 'html.parser').get_text().strip()
                    
                    # Generate deterministic UUID based on entry ID, date, and index to keep selections stable
                    entry_uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{entry.id}_{update_type}_{element_idx}"))
                    
                    all_updates.append({
                        'id': entry_uid,
                        'date': formatted_date,
                        'sort_date': sort_date,
                        'type': update_type,
                        'description': text_content,
                        'html_content': html_content,
                        'link': entry.link
                    })
                    element_idx += 1
                current_type = child.get_text().strip()
                current_elements = []
            elif child.name is not None:
                current_elements.append(child)
            elif str(child).strip():
                current_elements.append(child)
                
        # Append last element
        if current_type is not None or current_elements:
            update_type = current_type or 'Announcement'
            html_content = "".join(str(el) for el in current_elements).strip()
            text_content = BeautifulSoup(html_content, 'html.parser').get_text().strip()
            entry_uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{entry.id}_{update_type}_{element_idx}"))
            all_updates.append({
                'id': entry_uid,
                'date': formatted_date,
                'sort_date': sort_date,
                'type': update_type,
                'description': text_content,
                'html_content': html_content,
                'link': entry.link
            })
            
    return all_updates

def get_releases(force_refresh=False):
    """Retrieves release notes, checking cache first unless force_refresh is True."""
    cache_exists = os.path.exists(CACHE_FILE)
    
    if cache_exists and not force_refresh:
        try:
            with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                cache_data = json.load(f)
                
            # Check expiry
            cached_time = datetime.datetime.fromisoformat(cache_data.get('cached_at', '2000-01-01T00:00:00'))
            elapsed = (datetime.datetime.now() - cached_time).total_seconds()
            
            if elapsed < CACHE_EXPIRY_SECONDS:
                return cache_data.get('updates', []), cache_data.get('cached_at'), False
        except Exception as e:
            # If cache reading fails, fallback to fetching
            print(f"Error reading cache: {e}")
            
    # Fetch from feed
    try:
        response = requests.get(FEED_URL, timeout=15)
        response.raise_for_status()
        updates = parse_release_notes(response.content)
        
        # Save to cache
        cached_at = datetime.datetime.now().isoformat()
        cache_data = {
            'cached_at': cached_at,
            'updates': updates
        }
        with open(CACHE_FILE, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, ensure_ascii=False, indent=2)
            
        return updates, cached_at, True
    except Exception as e:
        print(f"Error fetching/parsing feed: {e}")
        # Fallback to expired cache if available rather than breaking
        if cache_exists:
            try:
                with open(CACHE_FILE, 'r', encoding='utf-8') as f:
                    cache_data = json.load(f)
                return cache_data.get('updates', []), cache_data.get('cached_at'), False
            except Exception:
                pass
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        updates, cached_at, is_fresh = get_releases(force_refresh)
        return jsonify({
            'success': True,
            'updates': updates,
            'cached_at': cached_at,
            'is_fresh': is_fresh
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
