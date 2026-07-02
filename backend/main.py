"""
AegisLog-Analytics — FastAPI Backend (Optional)
Provides API endpoints for heavy log processing using Pandas/NumPy.
The frontend works fully without this backend.

Usage:
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import pandas as pd
import numpy as np
import re
import json
from datetime import datetime

app = FastAPI(
    title="AegisLog-Analytics API",
    description="Backend ETL pipeline for security log analysis",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Apache/Nginx combined log format regex
APACHE_LOG_PATTERN = re.compile(
    r'^(\S+)\s+-\s+-\s+\[(.+?)\]\s+"(\w+)\s+(\S+)\s+HTTP/[\d.]+"'
    r'\s+(\d+)\s+(\d+)'
)

MONTH_MAP = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12,
}


def parse_apache_timestamp(raw: str) -> Optional[datetime]:
    """Parse Apache timestamp format: DD/Mon/YYYY:HH:MM:SS +ZZZZ"""
    match = re.match(
        r'^(\d{2})/(\w{3})/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s+[+-]\d{4}$',
        raw
    )
    if not match:
        return None
    day, month_str, year, hours, minutes, seconds = match.groups()
    month = MONTH_MAP.get(month_str)
    if month is None:
        return None
    return datetime(int(year), month, int(day), int(hours), int(minutes), int(seconds))


def categorize_status(code: int) -> str:
    if 100 <= code <= 399:
        return 'Success'
    elif 400 <= code <= 499:
        return 'Client Error'
    elif 500 <= code <= 599:
        return 'Server Error'
    return 'Unknown'


def parse_log_text(raw_text: str) -> pd.DataFrame:
    """Parse raw log text into a Pandas DataFrame."""
    records = []
    for line in raw_text.strip().split('\n'):
        line = line.strip()
        if not line:
            continue
        match = APACHE_LOG_PATTERN.match(line)
        if match:
            ip, ts_raw, method, endpoint, status, bytes_str = match.groups()
            ts = parse_apache_timestamp(ts_raw)
            if ts:
                records.append({
                    'timestamp': ts.isoformat() + 'Z',
                    'sourceIP': ip,
                    'method': method.upper(),
                    'endpoint': endpoint,
                    'statusCode': int(status),
                    'bytes': int(bytes_str),
                })

    if not records:
        return pd.DataFrame()

    df = pd.DataFrame(records)
    df['statusCategory'] = df['statusCode'].apply(categorize_status)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    return df


def compute_metrics(df: pd.DataFrame) -> dict:
    """Compute comprehensive metrics from a parsed DataFrame."""
    if df.empty:
        return {
            'totalRequests': 0, 'uniqueIPs': 0, 'errorRate': 0,
            'totalBandwidth': 0, 'requestsOverTime': [],
            'topIPs': [], 'statusDistribution': [], 'anomalies': [],
        }

    total = len(df)
    unique_ips = df['sourceIP'].nunique()
    errors = df[df['statusCode'] >= 400]
    error_rate = round((len(errors) / total) * 100, 2)
    total_bandwidth = int(df['bytes'].sum())

    # Requests over time (hourly buckets)
    df_copy = df.copy()
    df_copy['hour'] = df_copy['timestamp'].dt.floor('h')
    hourly = df_copy.groupby('hour').size().reset_index(name='count')
    hourly['time'] = hourly['hour'].dt.strftime('%m/%d %H:00')
    requests_over_time = hourly[['time', 'count']].to_dict(orient='records')

    # Top 10 IPs
    top_ips = (
        df['sourceIP'].value_counts()
        .head(10)
        .reset_index()
        .rename(columns={'index': 'ip', 'sourceIP': 'ip', 'count': 'count'})
    )
    if 'ip' not in top_ips.columns:
        top_ips.columns = ['ip', 'count']
    top_ips_list = top_ips.to_dict(orient='records')

    # Status distribution
    status_colors = {
        'Success': '#00F0FF',
        'Client Error': '#BD00FF',
        'Server Error': '#FF0055',
    }
    status_dist = (
        df['statusCategory'].value_counts()
        .reset_index()
    )
    status_dist.columns = ['name', 'value']
    status_dist['color'] = status_dist['name'].map(status_colors).fillna('#888888')
    status_distribution = status_dist.to_dict(orient='records')

    # Anomaly detection
    anomalies = []

    # DDoS: >30 requests in 5-minute window per IP
    for ip in df['sourceIP'].unique():
        ip_data = df[df['sourceIP'] == ip].sort_values('timestamp')
        if len(ip_data) > 30:
            ts_array = ip_data['timestamp'].values.astype(np.int64) // 10**9
            for i in range(len(ts_array)):
                window = ts_array[(ts_array >= ts_array[i]) & (ts_array <= ts_array[i] + 300)]
                if len(window) > 30:
                    anomalies.append({
                        'type': 'Potential DDoS',
                        'description': f'IP {ip} made over 30 requests within a 5-minute window (total: {len(ip_data)})',
                        'severity': 'CRITICAL',
                    })
                    break

    # Brute force
    login_failures = df[
        (df['method'] == 'POST') &
        (df['endpoint'].str.contains('login', na=False)) &
        (df['statusCode'].isin([401, 403]))
    ]
    for ip, count in login_failures['sourceIP'].value_counts().items():
        if count > 10:
            anomalies.append({
                'type': 'Brute Force',
                'description': f'IP {ip} had {count} failed login attempts',
                'severity': 'HIGH',
            })

    # Vulnerability scan
    suspicious_paths = ['/.env', '/wp-admin', '/phpmyadmin']
    for path in suspicious_paths:
        scanners = df[df['endpoint'].str.contains(re.escape(path), na=False)]
        for ip in scanners['sourceIP'].unique():
            cnt = len(scanners[scanners['sourceIP'] == ip])
            anomalies.append({
                'type': 'Vulnerability Scan',
                'description': f'IP {ip} made {cnt} request(s) to {path}',
                'severity': 'HIGH',
            })

    return {
        'totalRequests': total,
        'uniqueIPs': unique_ips,
        'errorRate': error_rate,
        'totalBandwidth': total_bandwidth,
        'requestsOverTime': requests_over_time,
        'topIPs': top_ips_list,
        'statusDistribution': status_distribution,
        'anomalies': anomalies,
    }


@app.get("/")
async def root():
    return {"name": "AegisLog-Analytics API", "status": "operational", "version": "1.0.0"}


@app.post("/api/parse-logs")
async def parse_logs(file: UploadFile = File(...)):
    """Upload and parse a log file. Returns structured data and metrics."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    content = await file.read()
    try:
        text = content.decode('utf-8')
    except UnicodeDecodeError:
        text = content.decode('latin-1')

    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else 'log'

    if ext == 'json':
        try:
            json_data = json.loads(text)
            if not isinstance(json_data, list):
                json_data = [json_data]
            df = pd.DataFrame(json_data)
            if 'statusCode' not in df.columns and 'status_code' in df.columns:
                df.rename(columns={'status_code': 'statusCode'}, inplace=True)
            if 'sourceIP' not in df.columns and 'source_ip' in df.columns:
                df.rename(columns={'source_ip': 'sourceIP'}, inplace=True)
            df['statusCategory'] = df['statusCode'].apply(categorize_status)
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse JSON: {str(e)}")
    else:
        df = parse_log_text(text)

    if df.empty:
        raise HTTPException(status_code=400, detail="No valid log entries found")

    metrics = compute_metrics(df)
    parsed_data = df.to_dict(orient='records')

    # Convert timestamps to strings for JSON serialization
    for entry in parsed_data:
        if isinstance(entry.get('timestamp'), (datetime, pd.Timestamp)):
            entry['timestamp'] = entry['timestamp'].isoformat()

    return {
        'parsedData': parsed_data,
        'metrics': metrics,
        'totalParsed': len(parsed_data),
        'fileName': file.filename,
    }


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "aegislog-analytics-backend"}
