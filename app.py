from flask import Flask, render_template, jsonify, request
import urllib.request
import xml.etree.ElementTree as ET
import re
import html
import time

app = Flask(__name__)

# Cache variables
_cache = {
    "data": None,
    "timestamp": 0
}
CACHE_DURATION_SECS = 300  # 5 minutes

def clean_html_content(content):
    """
    Cleans up description text, normalizes whitespace, 
    and handles basic markdown-like structures or tags.
    """
    if not content:
        return ""
    # Decode html entities
    cleaned = html.unescape(content)
    return cleaned

def fetch_and_parse_feed(force_refresh=False):
    global _cache
    now = time.time()
    
    # Return cached data if valid and force_refresh is not requested
    if not force_refresh and _cache["data"] and (now - _cache["timestamp"] < CACHE_DURATION_SECS):
        return _cache["data"], True

    url = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
    except Exception as e:
        # Fallback to cache if request fails, even if expired
        if _cache["data"]:
            return _cache["data"], True
        raise Exception(f"Failed to fetch release notes: {str(e)}")
        
    try:
        root = ET.fromstring(xml_data)
    except ET.ParseError as e:
        raise Exception(f"Failed to parse XML: {str(e)}")

    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    updates = []
    
    for entry in root.findall('atom:entry', ns):
        title_elem = entry.find('atom:title', ns)
        date = title_elem.text.strip() if title_elem is not None else "Unknown Date"
        
        updated_elem = entry.find('atom:updated', ns)
        updated_val = updated_elem.text.strip() if updated_elem is not None else ""
        
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        link = link_elem.attrib.get('href') if link_elem is not None else "https://cloud.google.com/bigquery/docs/release-notes"
        
        content_elem = entry.find('atom:content', ns)
        if content_elem is None:
            continue
            
        content_html = content_elem.text
        if not content_html:
            continue
            
        # Parse individual updates within each entry (which starts with <h3>)
        # Regex to split content by <h3>Heading</h3>
        matches = re.finditer(r'<h3>(.*?)</h3>(.*?)(?=<h3>|$)', content_html, re.DOTALL)
        
        for idx, match in enumerate(matches):
            utype = match.group(1).strip()
            ucontent_raw = match.group(2).strip()
            
            # Clean HTML structure
            ucontent_clean = clean_html_content(ucontent_raw)
            
            # Extract plain text for Tweeting (strip HTML tags)
            plain_text = re.sub(r'<[^<]+?>', '', ucontent_raw)
            # Remove extra whitespaces
            plain_text = re.sub(r'\s+', ' ', plain_text).strip()
            # Unescape html characters in plain text too
            plain_text = html.unescape(plain_text)
            
            updates.append({
                'id': f"{date.replace(' ', '_').replace(',', '')}_{idx}",
                'date': date,
                'type': utype,
                'html': ucontent_clean,
                'plain_text': plain_text,
                'link': link
            })
            
    _cache["data"] = updates
    _cache["timestamp"] = now
    return updates, False

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    force = request.args.get('force', 'false').lower() == 'true'
    try:
        notes, cached = fetch_and_parse_feed(force_refresh=force)
        return jsonify({
            'success': True,
            'notes': notes,
            'cached': cached,
            'count': len(notes)
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
