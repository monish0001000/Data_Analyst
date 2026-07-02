# 🛡️ AegisLog-Analytics

**AI-Driven Cyber Threat & Security Log Intelligence Platform**

A modern web-based Data Analytics Dashboard that ingests raw server logs, processes them through an ETL (Extract, Transform, Load) pipeline, and visualizes network operational security insights using AI-driven automation. 

Designed with a high-end **Cyberpunk Dark Mode** aesthetic featuring sophisticated glassmorphism and neon accents.

---

## ✨ Key Features

- **Real-Time Log Ingestion**: Instant drag-and-drop client-side parsing for `.log`, `.txt`, and `.json` files.
- **Advanced ETL Engine**: Built-in logic to parse Apache/Nginx combined logs, normalize data structures, and categorize status codes.
- **Heuristic Threat Detection**:
  - 🚨 **DDoS Patterns**: Flags IPs causing high-velocity request spikes.
  - 🔑 **Credential Stuffing**: Detects brute-force attempts on authentication endpoints.
  - 🕵️‍♂️ **Vulnerability Scanning**: Identifies probes to sensitive paths like `/.env`, `/wp-admin`, or `/phpmyadmin`.
- **Interactive Visualization**: Powered by Recharts. Features area timelines, top source IP bar charts, and response code donut charts.
- **AI Integration**: Features a terminal-style typewriter output that provides a localized heuristic security report, with the ability to plug in a Google Gemini API key for advanced Generative AI threat analysis.

---

## 🛠️ Technology Stack

- **Frontend core**: React.js (Vite), Tailwind CSS
- **Icons & Animations**: Lucide React, Framer Motion
- **Data Visualization**: Recharts
- **Backend (Optional)**: Python, FastAPI, Pandas, NumPy (provided in `/backend` for heavy off-site ETL processing)

---

## 🚀 Getting Started

### 1. Install Dependencies
Make sure you have Node.js installed, then run:
```bash
npm install
```

### 2. Start the Development Server
```bash
npm run dev
```
Navigate to `http://localhost:5173` in your browser.

### 3. (Optional) Start the Python Backend
The frontend is completely functional on its own (client-side processing). However, if you wish to use the FastAPI backend for heavy lifting:
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

---

## 🧪 Testing with Massive Datasets (150,000 Records)

This repository includes a dedicated `Tester/` folder containing three massive mock datasets (**50,000 records each**), generated explicitly to test the platform's parsing speed, rendering capabilities, and threat detection algorithms.

1. **`Tester/Test.log`**: 50,000 lines (Apache format) simulating a mix of normal employee traffic and coordinated DDoS + credential stuffing attacks.
2. **`Tester/Test.json`**: 50,000 lines formatted as structured JSON payloads.
3. **`Tester/Test.txt`**: 50,000 lines (Apache format) simulating vulnerability scanning probes.

**How to test:** 
Simply drag and drop any of these files into the Dropzone on the web application dashboard. The dashboard will instantly process the 50,000 records and visualize the anomalies.

---

## 🧠 Using Aegis AI

In the dashboard, click the **"Analyze with Aegis AI"** button. 
- **Offline Mode**: By default, the application runs a sophisticated local heuristic engine to grade your security posture and identify anomalous IPs.
- **Cloud Mode**: Click the settings gear to input your Gemini AI API Key securely. This unlocks deep, context-aware generative threat intelligence. 

---
*Created as part of an Advanced Agentic Coding architecture project.*
