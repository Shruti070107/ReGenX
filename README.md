<h1 align="center">
  🌿 ReGenX
</h1>

<div align="center">

### *Smart Circular Bio-Waste Logistics Platform with AI scanning, real-time GPS tracking, and role-based dashboards for Providers, Riders & Processing Plants.*

<br>
<br>


![HTML](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![TensorFlow](https://img.shields.io/badge/TensorFlow.js-FF6F00?style=flat&logo=tensorflow&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-199900?style=flat&logo=leaflet&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-5A0FC8?style=flat&logo=pwa&logoColor=white)
![Chart.js](https://img.shields.io/badge/Chart.js-FF6384?style=flat&logo=chartdotjs&logoColor=white)

</div>

> ReGenX is a premium Progressive Web App (PWA) that digitizes the entire bio-waste supply chain — from hotel waste generation, through GPS-tracked rider pickup, to verified delivery at processing plants.

The platform combines AI-powered waste scanning, live GPS tracking, analytics dashboards, blockchain reward systems, and sustainability impact monitoring into one modern ecosystem. Built using modern frontend technologies and optimized for scalability, ReGenX focuses on sustainability, logistics automation, and environmental transparency.



---

 
## ✨ Core Features

### 🤖 AI-Powered Bio Scanner
- Real-time waste image analysis using **TensorFlow.js + MobileNet**
- Contamination detection and organic percentage scoring
- Auto-fills dispatch form fields based on scan results
- Supports live camera capture and file upload
  
<br>

### 📍 Real-Time GPS & Mapping
- High-accuracy GPS detection with draggable pin refinement
- Address-based geocoding via **Nominatim / OpenStreetMap**
- 50km service radius enforcement for route eligibility
- Live rider tracking with **Leaflet.js** interactive maps

<br>

### 👥 Role-Based Dashboards
| Role | Capabilities |
|---|---|
| 🏨 **Provider** (Hotel/Hostel) | Create dispatch requests, scan waste, track active pickups, view analytics |
| 🚛 **Rider** | Accept routes, navigate to pickup, confirm collection with AI scan |
| ⚗️ **Plant** | Monitor incoming waste flow, confirm receipt, log processed output |

<br>

### 🪙 $RGX Token Economy
- Providers earn **$RGX tokens** on every verified pickup
- Trade tokens on the **ReGen DeFi Exchange** (CSR NFTs, Smart Bin Hardware, Energy Vouchers)
- Stake tokens in the **Carbon Credit Fund** (12.5% APY)
- Contribute to the **Amazon Reforestation Initiative** crowdfund

<br>

### 🌍 Impact & Analytics
- CO₂ offset calculator (per completed dispatch)
- Weekly/Monthly waste history with Chart.js bar charts
- Regional Leaderboard (top waste diverters in your area)
- AI-predicted waste volume for next day
- **The Green Wall** — live community sustainability activity feed

<br>

### 🎨 Premium UI/UX
- Glassmorphism design with dark/light theme toggle
- Live ticker bar with real-time platform activity
- Smooth micro-animations and transitions
- Fully responsive — mobile-first PWA with offline support
- Space Grotesk + Inter typography

  <br>

### 💎 Quality Standards

To maintain the quality:exceptional label, the implementation MUST:
Use Glassmorphism and premium UI aesthetics
Include smooth micro-animations and transitions
Be fully responsive and PWA-ready
Maintain zero console errors
Follow clean and modular code practices
Include proper documentation/comments
Ensure accessibility and mobile optimization



---

<div align="center">

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Structure | HTML5 (Semantic) |
| Styling | Vanilla CSS3 (Glassmorphism, CSS Variables) |
| Logic | Vanilla JavaScript (ES6 Modules) |
| AI / ML | TensorFlow.js, MobileNet |
| Maps | Leaflet.js, OpenStreetMap, Nominatim |
| Charts | Chart.js |
| PWA | Service Worker, Web App Manifest |
| Weather | Open-Meteo API |
| Storage | LocalStorage cache + Socket.IO realtime state sync |

</div>

---
<div align="center">

## 📁 Project Structure

```

├── ReGenX/
├── .github/                  
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE/

├── scripts/                  
│   └── appwrite-deploy.mjs   

├── src/
│   ├── app.js                
│   ├── esg-reporter.js       
│   ├── intelligence.js       
│   ├── scanner.js            
│   ├── styles.css            
│   ├── trust.js              
│   ├── vision-scanner.js     
│   └── yield-optimizer.js    

├── .env.example              
├── .gitignore                
├── appwrite.config.example.json

├── index.html                
├── manifest.json             
├── package-lock.json         
├── package.json              

├── push.bat                  
├── README.md                 

└── service-worker.js         
```

</div>
---
 
## 🚀 Getting Started


### 📋 Prerequisites
> Before running the project, ensure you have:

Node.js installed
npm installed
Modern browser (Chrome recommended)
Camera permissions enabled (for AI scanning)

### ⚙️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/ReGenX.git

#2.Move Into Project Directory
cd ReGenX

#3. Install dependencies
npm install

#4. Start development server
npm run serve
```
Then open `http://localhost:4173` in your browser.

The realtime server keeps Provider, Rider, and Plant dashboards synchronized across open tabs and devices.

###👤 First-Time Setup
1. **Register** your account
2. Select your role
      Provider
      Rider
      Plant)
4. Enable location access
5. Login and explore your role-specific dashboard

> **Tip:**Create both Provider and Rider accounts for testing full logistics flow!

---


 
## 🔐 Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in your Appwrite credentials:
```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your-project-id
APPWRITE_API_KEY=your-private-api-key
```

> ⚠️ **Never expose your Appwrite API key in frontend code.**

## 📦 Deployment
Appwrite Deployment

```bash
npm run deploy:appwrite
```
Deployment script automatically::
- Create the Appwrite Site if it doesn't exist
- Upload the static project as a new deployment
- Wait for build completion and auto-activate

---


<div align="center">
 
## 🔄 Pickup Workflow

<pre>        ↓
   (Optional) BioScan AI verifies waste quality
        ↓
   Request appears on Rider's job board
        ↓
   Rider accepts → navigates to pickup location
        ↓
   Rider confirms collection (actual kg + AI scan)
        ↓
   Rider marks "Arrived at Plant"
        ↓
   Plant confirms receipt → order COMPLETED
        ↓
   Provider earns $RGX tokens 🪙
</pre>

</div>

---



## 🌱 Environmental Impact

Every completed dispatch through ReGenX:
- Diverts bio-waste from landfills
- Calculates **CO₂ offset** (0.62 kg CO₂ per kg bio-waste)
- Mints verifiable $RGX carbon credits
- Contributes to the global Green Wall feed

---

## 📸 Screenshots

> *Coming soon... — deploy and capture your dashboard!*

---

## 🤝 Contributing
We welcome open-source contributions.
>Contribution Steps
1. Fork Repository
2. Create Branch
git checkout -b feature-name
3. Commit Changes
git commit -m "Added new feature"
4. Push Changes
git push origin feature-name
5. Open Pull Request
---

## 📄 License

This project is open source. See [LICENSE](LICENSE) for details.

### 💚 Support the Project

If you like ReGenX:

⭐ Star the repository
🍴 Fork the project
🚀 Contribute to development
🌍 Promote sustainability initiatives

---

<div align="center">

Made with 💚 for a cleaner planet · **ReGenX** · *Closing the loop on bio-waste*

</div>
