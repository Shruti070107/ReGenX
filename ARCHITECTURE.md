# ReGenX Architecture

## 🌿 Overview

ReGenX is a Smart Circular Bio-Waste Logistics Platform built as a Progressive Web App (PWA).  
It digitizes the complete bio-waste lifecycle using AI-powered waste scanning, real-time GPS tracking, analytics dashboards, and role-based workflows.

The system architecture is designed to be:

- Modular
- Scalable
- Offline-first
- Real-time synchronized
- Mobile responsive
- Sustainability focused

---

# 🏗️ High-Level Architecture

```text
 ┌─────────────────────────────────────┐
 │             USER DEVICES            │
 │─────────────────────────────────────│
 │ Provider Dashboard                  │
 │ Rider Dashboard                     │
 │ Plant Dashboard                     │
 │ Mobile + Desktop PWA                │
 └─────────────────────────────────────┘
                    │
                    ▼
 ┌─────────────────────────────────────┐
 │         FRONTEND APPLICATION        │
 │─────────────────────────────────────│
 │ HTML5 + CSS3 + JavaScript           │
 │ Glassmorphism UI                    │
 │ ES6 Modular Architecture            │
 │ Progressive Web App                 │
 └─────────────────────────────────────┘
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
┌──────────┐  ┌────────────┐  ┌──────────────┐
│ AI Layer │  │ GPS Layer  │  │ Analytics    │
│──────────│  │────────────│  │ Layer        │
│TensorFlow│  │ Leaflet.js │  │ Chart.js     │
│MobileNet │  │ OpenStreet │  │ ESG Reports  │
└──────────┘  └────────────┘  └──────────────┘
     │              │               │
     └──────────────┼───────────────┘
                    ▼
 ┌─────────────────────────────────────┐
 │      REALTIME SYNC ENGINE           │
 │─────────────────────────────────────│
 │ Socket.IO Synchronization           │
 │ LocalStorage Cache                  │
 │ Offline Queue System                │
 │ Background Sync                     │
 └─────────────────────────────────────┘
                    │
                    ▼
 ┌─────────────────────────────────────┐
 │          CLOUD / BACKEND            │
 │─────────────────────────────────────│
 │ Appwrite Authentication             │
 │ Database & User Management          │
 │ Deployment Hosting                  │
 └─────────────────────────────────────┘
```

---

# 🧩 Frontend Architecture

## Technologies Used

| Layer | Technology |
|------|-------------|
| Structure | HTML5 |
| Styling | CSS3 |
| Logic | Vanilla JavaScript |
| AI | TensorFlow.js |
| Maps | Leaflet.js |
| Charts | Chart.js |
| PWA | Service Worker + Manifest |

---

# 🤖 AI Scanner Architecture

The AI subsystem performs bio-waste image analysis using TensorFlow.js and MobileNet.

## AI Workflow

```text
Image Capture
      │
      ▼
TensorFlow.js Processing
      │
      ▼
MobileNet Inference
      │
      ▼
Waste Classification
      │
      ▼
Organic Percentage Score
      │
      ▼
Dispatch Form Autofill
```

## AI Components

| File | Purpose |
|------|----------|
| scanner.js | Camera & image capture |
| vision-scanner.js | AI inference logic |
| models/mobilenet | Offline AI model |

---

# 📍 GPS & Mapping Architecture

The GPS layer manages real-time logistics tracking and route visualization.

## GPS Workflow

```text
Location Access
      │
      ▼
Geolocation API
      │
      ▼
Leaflet.js Map Rendering
      │
      ▼
OpenStreetMap Tiles
      │
      ▼
Route & Pickup Tracking
```

## Features

- Live rider tracking
- Route navigation
- Address geocoding
- Service radius validation
- Draggable map pins

---

# 👥 Role-Based System

ReGenX supports three primary user roles.

| Role | Responsibilities |
|------|------------------|
| Provider | Create dispatches & track pickups |
| Rider | Accept routes & confirm collections |
| Plant | Verify delivery & processing |

---

# 🔄 Real-Time Synchronization

The platform uses a hybrid synchronization architecture.

## Sync Components

| Component | Function |
|-----------|----------|
| Socket.IO | Real-time updates |
| LocalStorage | Offline cache |
| Service Worker | Background sync |
| Offline Queue | Deferred requests |

## Sync Workflow

```text
User Action
     │
     ▼
Local Cache Update
     │
     ▼
Socket.IO Broadcast
     │
     ▼
Realtime Dashboard Sync
     │
     ▼
Cloud Persistence
```

---

# 📦 Progressive Web App (PWA)

ReGenX is fully optimized as an installable PWA.

## PWA Components

| File | Purpose |
|------|----------|
| manifest.json | App metadata |
| service-worker.js | Offline support |
| offline.html | Offline fallback page |
| icons/ | App icons |

## PWA Features

- Installable application
- Offline functionality
- Push notifications
- Cached AI models
- Mobile-first experience

---

# 📊 Analytics Architecture

The analytics layer generates sustainability and ESG insights.

## Features

- CO₂ offset calculations
- Waste analytics
- Weekly/monthly reports
- Sustainability leaderboard
- AI predictions

## Analytics Workflow

```text
Dispatch Data
      │
      ▼
Aggregation Engine
      │
      ▼
Chart.js Visualization
      │
      ▼
ESG Reporting
```

---

# 🪙 Token Economy Architecture

ReGenX uses the $RGX reward ecosystem.

## Token Flow

```text
Waste Pickup Verified
        │
        ▼
Reward Engine
        │
        ▼
$RGX Token Generation
        │
        ▼
User Wallet Credit
```

## Supported Features

- Carbon credits
- Sustainability rewards
- Marketplace ecosystem
- Staking system

---

# 🔐 Security Architecture

## Security Layers

| Layer | Protection |
|------|-------------|
| Authentication | Appwrite Auth |
| API Security | Tokenized requests |
| Environment Variables | Secure credentials |
| Access Control | Role-based authorization |

## Security Practices

- Protected environment variables
- HTTPS enforcement
- Authentication tokens
- Secure deployment pipeline

---

# 📁 Project Structure

```text
ReGenX/
│
├── src/
│   ├── app.js
│   ├── scanner.js
│   ├── vision-scanner.js
│   ├── intelligence.js
│   ├── esg-reporter.js
│   ├── trust.js
│   ├── yield-optimizer.js
│   └── styles.css
│
├── models/
├── icons/
├── scripts/
├── manifest.json
├── service-worker.js
├── index.html
└── README.md
```

---

# ☁️ Deployment Architecture

## Deployment Workflow

```text
Developer Push
       │
       ▼
GitHub Repository
       │
       ▼
Appwrite Deployment Script
       │
       ▼
Static Hosting Deployment
       │
       ▼
Production Activation
```

---

# 🌱 Sustainability Impact Architecture

## Environmental Flow

```text
Bio-Waste Collection
        │
        ▼
Landfill Diversion
        │
        ▼
CO₂ Reduction Calculation
        │
        ▼
Carbon Credit Generation
        │
        ▼
Community ESG Feed
```

---

# 🚀 Scalability Features

- Modular ES6 architecture
- Offline-first design
- Realtime synchronization
- Lightweight frontend
- Cloud deployment support
- Expandable AI modules

---

# ✅ Architectural Strengths

- AI-powered waste verification
- Offline-first PWA support
- Real-time logistics management
- Role-based dashboards
- Sustainability-focused analytics
- Scalable modular codebase
- Mobile-first responsive design

---

# 📌 Conclusion

ReGenX combines AI, logistics automation, sustainability analytics, and modern web technologies into one unified ecosystem.

The architecture ensures:

- Scalability
- Offline resilience
- Real-time coordination
- Environmental transparency
- Premium user experience
- Maintainable modular development

The platform demonstrates how modern frontend technologies can build intelligent and sustainable logistics ecosystems for real-world environmental impact.