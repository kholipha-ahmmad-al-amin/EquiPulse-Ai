<div align="center">
  <img src="public/equipulse.svg" alt="EquiPulse AI" width="120" />

  # EquiPulse AI
  **The Intelligent Operating System for Global Micro-SMEs**

  [![Live Demo](https://img.shields.io/badge/Live_Demo-EquiPulse_AI-059669?style=for-the-badge&logo=vercel)](https://equipulse-ai.equisaas-bd.com/)
  [![Architecture](https://img.shields.io/badge/Architecture-Offline_First-0f172a?style=for-the-badge&logo=googlecloud)](https://equipulse-ai.equisaas-bd.com/)
  [![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=for-the-badge)](https://www.gnu.org/licenses/agpl-3.0)

  *Engineered by Team EquiSaaS BD – Bangladesh's First Open Tech Cooperative.*
</div>

---

## 🏛️ Engineering Manifesto: The Problem & The Vision

### The Problem
Traditional POS and ERP software is built for the top 1% of businesses—enterprises with continuous power, gigabit internet, and dedicated IT teams. But what about the 99%? 
The micro-SMEs, corner stores, and emerging markets operate in environments where internet connectivity is brittle, hardware is constrained, and cloud latency is unacceptable. Existing solutions fail them by enforcing "cloud-only" paradigms, resulting in lost sales when the network drops.

### The Solution: EquiPulse AI
EquiPulse AI is a Silicon Valley-grade, **Local-First AI Data Operating System**. We engineered it from the ground up to operate completely independent of the internet while leveraging decentralized Peer-to-Peer (P2P) synchronization and intelligent browser-native capabilities (IndexedDB + Web Workers + Wasm).

**Core Philosophies:**
1. **Local-First Autonomy:** The app loads instantly and works 100% offline. Data lives locally first and syncs to the cloud asynchronously using CRDTs (Conflict-free Replicated Data Types).
2. **Zero-Latency AI:** Intelligence should not require an API call. We embedded DuckDB WASM and local AI routing directly into the client.
3. **Hardware Agnostic:** Whether scanning barcodes, printing receipts (Bluetooth Thermal & Fiscal), or syncing data, the system communicates directly with hardware via modern Web APIs.

---

## 🚀 Live Demo
Experience the raw speed of a true local-first architecture. 

👉 **[Access the Production Environment: https://equipulse-ai.equisaas-bd.com/](https://equipulse-ai.equisaas-bd.com/)**

> *Note: For the best offline-first experience, install the app directly via your browser as a Progressive Web App (PWA).*

---

## 💻 Elite Technology Stack

- **Framework:** React 19 + Vite (Highly optimized module bundling)
- **Styling:** Vanilla CSS + Tailwind CSS + Framer Motion (Hardware-accelerated animations)
- **Data Persistence:** IndexedDB (via localForage) + Firebase (Cloud Sync) + DuckDB-Wasm
- **State Management:** Zustand with CRDT sync logic
- **AI & Analytics:** DuckDB WASM (Browser-native OLAP engine) + Gemini Pro integration + Local Model Fallbacks
- **Hardware Integration:** Web Bluetooth API (Thermal Printing), Web Serial API (Weight Scales)

---

## ⚙️ How to Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/kholipha-ahmmad-al-amin/EquiPulse-Ai.git
cd EquiPulse-Ai

# 2. Install dependencies (Node.js 18+ required)
npm install

# 3. Start the Vite Dev Server
npm run dev
```

---

## 📐 System Architecture Diagram

```mermaid
graph TD
    subgraph Client [Browser / PWA Client]
        UI[React UI + Framer Motion]
        State[Local State / Context]
        Worker[Web Worker Thread]
        IDB[(IndexedDB)]
        WASM[DuckDB WASM]
        
        UI --> State
        State <--> Worker
        Worker <--> IDB
        UI --> WASM
    end

    subgraph Hardware [Edge Devices]
        Scanner[Barcode Scanner]
        Printer[Thermal / Fiscal Printer]
        Scale[Weight Scale]
        
        UI -.->|Web Serial| Scale
        UI -.->|Web Bluetooth| Printer
        UI -.->|Keyboard Events| Scanner
    end

    subgraph Cloud [Cloud Infrastructure]
        Firebase[(Firebase Firestore)]
        Storage[(Firebase Storage)]
        LLM[Google Gemini API]
    end

    Worker -.->|Async CRDT Sync| Firebase
    Worker -.->|Backup Sync| Storage
    WASM -.->|Text-to-SQL| LLM
```

---

## 🗄️ Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    STORE-PROFILE ||--o{ INVENTORY-ITEM : maintains
    STORE-PROFILE ||--o{ STAFF-MEMBER : employs
    STORE-PROFILE ||--o{ CUSTOMER : serves
    STORE-PROFILE ||--o{ SALE-TRANSACTION : records
    
    SALE-TRANSACTION ||--|{ SALE-LINE-ITEM : contains
    INVENTORY-ITEM ||--o{ SALE-LINE-ITEM : "sold as"
    CUSTOMER ||--o{ SALE-TRANSACTION : "makes"
    STAFF-MEMBER ||--o{ SALE-TRANSACTION : "processes"

    INVENTORY-ITEM {
        string id PK
        string name
        float price
        int quantity
        string category
    }
    
    SALE-TRANSACTION {
        string id PK
        float totalAmount
        float tax
        float discount
        datetime timestamp
    }
```

---

## 🔄 Data Flow Diagram (DFD Level 1)

```mermaid
flowchart LR
    User([Cashier / Admin])
    Sys((EquiPulse POS Core))
    DB[(Local IndexedDB)]
    Cloud[(Firebase Sync)]
    AI((AI Insight Engine))

    User -->|Inputs Sale Data| Sys
    Sys -->|Caches Instantly| DB
    Sys -->|Syncs Async| Cloud
    DB -->|Offline Read| Sys
    Sys -->|Fetches Analytical Data| AI
    AI -->|Returns Business Insights| User
```

---

## 🎯 Use Case Diagram

```mermaid
graph LR
    Cashier((Cashier))
    Manager((Store Manager))
    AI((AI Assistant))

    subgraph Core Features
        PS[Process Sales]
        SB[Scan Barcodes]
        PR[Print Receipts]
        MI[Manage Inventory]
        VA[View Analytics]
        UM[Upload OCR Memos]
        GR[Generate Restock Alerts]
        PP[Pricing Strategies]
    end

    Cashier --> PS
    Cashier --> SB
    Cashier --> PR
    
    Manager --> MI
    Manager --> VA
    Manager --> UM
    
    UM -.->|extends| PS
    
    AI --> GR
    AI --> PP
```

---

## ⏱️ Sequence Diagram (Offline-First Checkout Flow)

```mermaid
sequenceDiagram
    participant User as Cashier
    participant UI as POS Interface
    participant DB as Local IndexedDB
    participant Cloud as Firebase (Cloud)

    User->>UI: Scan Item & Click Checkout
    activate UI
    UI->>UI: Calculate Totals & Taxes
    UI->>DB: Save Transaction (Offline Mode)
    activate DB
    DB-->>UI: Transaction Committed Locally
    deactivate DB
    UI-->>User: Show Receipt & Success (Zero Latency)
    deactivate UI

    Note over UI,Cloud: Background Async Process
    UI->>Cloud: Attempt Sync Transaction
    alt Network Available
        Cloud-->>UI: Sync Success (CRDT merged)
    else Network Offline
        UI->>UI: Queue in Local Sync Buffer
    end
```

---

## 👥 Meet Team EquiSaaS BD
**Bangladesh's First Open Tech Cooperative**

We are a syndicate of passionate engineers and designers united by a single goal: democratizing enterprise technology for the masses.

### Members:
* **🇧🇩 Sandipta Karmakar** (Project Coordinator) — Strategic Planning & Execution
* **🇧🇩 Kholipha Ahmmad Al-Amin** (Team Leader / Project Coordinator / Backend / Database / Scraper Engineer) — System Arch, DB, Scrapers & Sync Engines
* **🇧🇩 Abu Hurayra** (UI/UX / Frontend Developer / Presentation / Communication Lead) — UI/UX Designs, Components & Demos
* **🇧🇩 Jannatul Nayeem** (Presentation / Communication Lead) — Pitch Deck & Communications
* **🇧🇩 Sanzida Rahman** (Member / UI/UX / Frontend Developer) — Design System & Component Arch

---
<div align="center">
  <p><i>"Software should work for the user, not the network."</i></p>
  <b>© 2026 EquiPulse AI by EquiSaaS BD</b>
</div>
