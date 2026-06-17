# BigQuery Release Notes Live Tracker & Twitter Share

A premium, modern web application built using **Python Flask** and **Vanilla Frontend (HTML, CSS, JavaScript)**. It tracks official Google Cloud BigQuery release notes in real time, organizes updates into categoric blocks, and allows developers to draft and share specific releases on Twitter/X with single-click pre-formatted templates.

---

## 🚀 Key Features

*   **Granular XML Extraction:** Connects directly to the official Google Cloud Atom feed and segment daily log dumps into individual release records.
*   **Intelligent Classification:** Automatically badgifies releases into `Feature`, `Issue`, `Deprecation`, `Change`, and `Announcement` types.
*   **Real-time Search & Filter:** Dynamic in-memory filters let you find specific release items by category or keyword instantly.
*   **Built-in Caching:** Prevents server rate-limiting and boosts load performance via a 5-minute memory cache.
*   **Theme Switcher (Dark / Light Mode):** Swaps color themes dynamically by overriding CSS root variables with a smooth transition. Saves theme preference in `localStorage` to persist selection across reloads.
*   **Clipboard Copy Tool:** Copy the plain-text description of any release note instantly to your clipboard with one click (includes visual feedback).
*   **CSV Export Utility:** Download the currently filtered/searched list of release notes as a formatted CSV spreadsheet file.
*   **Social Composer Panel:**
    *   3 customizable layout templates (Short Announcement, Detailed Summary, Discussion Question).
    *   Live validation with visual circular SVG character limit countdown (max 280 characters).
    *   Pre-populated Twitter Web Intent redirection (zero API keys configuration required).
*   **Responsive UI:** Glassmorphism dashboard style with smooth transitions.

---

## 🛠️ Architecture

```
[Google Cloud Feed] 
       │
       ▼ (Urllib HTTP XML Request)
[Flask Server (app.py)] 
       │ (ElementTree Atom Parsing & RegEx heading splitting)
       ▼ (5-min cache check)
[API Endpoint: /api/notes] 
       │
       ▼ (JavaScript Async Fetch)
[Client (app.js + style.css)] ───► [Twitter/X Intent Redirect]
```

---

## 📂 Project Structure

```
agy-cli-projects/
├── app.py                  # Flask backend (caching, parsing, REST API)
├── templates/
│   └── index.html          # Semantic HTML dashboard template
├── static/
│   ├── app.js              # Client state, filter queries, CSV export, clipboard copy, theme switcher
│   └── style.css           # Responsive dark/light theme overrides & transitions
├── .gitignore              # Configured paths to ignore
└── README.md               # Project documentation
```

---

## 💻 Getting Started

### Prerequisites
Make sure you have **Python 3.8+** installed.

### 1. Clone & Set Up Directory
```bash
git clone https://github.com/KarnikaKuruba/antigravity-event-talks-app.git
cd antigravity-event-talks-app
```

### 2. Install Flask
```bash
pip install flask
```

### 3. Run the Server
```bash
python app.py
```
After starting the server, open your browser and navigate to:
👉 **http://127.0.0.1:5000**

---

## 🌐 Deploying to Google Cloud Run

To containerize and deploy this application directly to Cloud Run, follow these steps:

### 1. Initialize Dockerfile
Create a `Dockerfile` in the root directory:
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["gcloud", "run", "deploy"] # Or start server
# Note: Bind to 8080 and host 0.0.0.0 for Cloud Run
```
*(Ensure `requirements.txt` contains `flask`)*

### 2. Build and Deploy
Run the deploy command using Google Cloud SDK:
```bash
gcloud run deploy bigquery-tracker-app --source . --region=us-central1 --allow-unauthenticated
```
