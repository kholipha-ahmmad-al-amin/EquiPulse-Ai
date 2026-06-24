# EquiPulse AI 🚀
**The Intelligent POS & Supply Chain Ecosystem for the Global South**

[![Deploy](https://github.com/kholipha-ahmmad-al-amin/EquiPulse-Ai/actions/workflows/firebase-hosting-merge.yml/badge.svg)](https://equipulse-ai.equisaas-bd.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0--beta-blue.svg)](https://equipulse-ai.equisaas-bd.com/)

> **Live Demo:** [https://equipulse-ai.equisaas-bd.com/](https://equipulse-ai.equisaas-bd.com/)

## 📖 Problem & Solution Statement
In the Global South, millions of micro-entrepreneurs and SMEs run their daily operations on paper due to unreliable internet, complex software, and high costs. **EquiPulse AI** bridges this gap. It is an **offline-first, AI-driven Point of Sale (POS) and Inventory Management ecosystem**. Built with Vite, React, and Firebase, it features real-time sync, local-first architectures (IndexedDB), and on-device NLP search capabilities—ensuring businesses never stop, even when the internet does.

---

## 🏗 System Architecture Diagram

```mermaid
graph TD
    %% Define styles
    classDef client fill:#eef2ff,stroke:#6366f1,stroke-width:2px,color:#312e81
    classDef offline fill:#f0fdf4,stroke:#22c55e,stroke-width:2px,color:#14532d
    classDef cloud fill:#f0f9ff,stroke:#0ea5e9,stroke-width:2px,color:#0c4a6e
    classDef ai fill:#fdf4ff,stroke:#d946ef,stroke-width:2px,color:#701a75

    subgraph "Frontend Application Layer (Vite + React)"
        UI["React UI Components"]
        State["Zustand State Management"]
        I18n["i18next (15 Languages)"]
        ServiceWorker["Service Worker / PWA"]
    end

    subgraph "Local Offline Persistence"
        IDB[(IndexedDB)]
        LocalStorage[(Local Storage)]
    end

    subgraph "Cloud Infrastructure (Firebase)"
        Auth["Firebase Authentication"]
        Firestore["(Cloud Firestore)"]
        Storage["(Cloud Storage)"]
    end

    subgraph "AI & ML Processing"
        NLP["On-Device Intent Parser"]
        Groq["Groq API (Llama 3)"]
        Gemini["Google Gemini API"]
    end

    %% Connections
    UI --> State
    State <--> IDB
    State <--> I18n
    ServiceWorker --> UI
    
    IDB <--> |Background Sync| Firestore
    UI --> Auth
    UI --> Storage
    
    UI --> NLP
    NLP --> Groq
    NLP --> Gemini

    %% Apply styles
    class UI,State,I18n,ServiceWorker client
    class IDB,LocalStorage offline
    class Auth,Firestore,Storage cloud
    class NLP,Groq,Gemini ai
```

---

## 📊 Entity-Relationship Diagram

```mermaid
erDiagram
    STORE ||--o{ USER : has
    STORE ||--o{ INVENTORY_ITEM : owns
    STORE ||--o{ SALE : processes
    STORE ||--o{ CUSTOMER : serves
    
    INVENTORY_ITEM ||--o{ SALE_LINE_ITEM : "included in"
    SALE ||--|{ SALE_LINE_ITEM : contains
    CUSTOMER ||--o{ SALE : "makes purchase"

    STORE {
        string id PK
        string name
        string category
        string currency
        string taxRate
    }
    
    INVENTORY_ITEM {
        string id PK
        string storeId FK
        string name
        float price
        float costPrice
        int quantity
        string barcode
    }
    
    SALE {
        string id PK
        string storeId FK
        float totalAmount
        float discount
        datetime createdAt
        string paymentMethod
    }
    
    SALE_LINE_ITEM {
        string id PK
        string saleId FK
        string itemId FK
        int quantity
        float unitPrice
    }
```

---

## 🔄 Data Flow Diagram Level 1

```mermaid
graph LR
    classDef external fill:#f3f4f6,stroke:#4b5563,stroke-width:2px
    classDef process fill:#eef2ff,stroke:#6366f1,stroke-width:2px
    classDef datastore fill:#fef3c7,stroke:#d97706,stroke-width:2px
    
    User("Store Owner"):::external
    Customer("Customer"):::external
    
    POS["1.0 POS Checkout"]:::process
    Inv["2.0 Inventory Management"]:::process
    Sync["3.0 Offline/Online Sync"]:::process
    Analytics["4.0 Business Analytics"]:::process
    
    LocalDB[("Local IndexedDB")]:::datastore
    CloudDB[("Firebase Cloud")]:::datastore
    
    User -->|Barcodes, Payments| POS
    User -->|Stock Updates| Inv
    Customer -->|Cash/Card| POS
    
    POS -->|Write Transaction| LocalDB
    Inv -->|Update Stock| LocalDB
    
    LocalDB <-->|Read/Write| Sync
    Sync <-->|Push/Pull| CloudDB
    
    LocalDB -->|Read Aggregates| Analytics
    Analytics -->|Display Charts| User
```

---

## 👥 Use Case Diagram

```mermaid
flowchart LR
    %% Actors
    StoreOwner(["🧑‍💼 Store Owner"])
    Staff(["🧑‍💻 Cashier/Staff"])
    
    subgraph "EquiPulse AI Core"
        UC1(["Process Sale (Offline)"])
        UC2(["Scan Barcode"])
        UC3(["Manage Inventory"])
        UC4(["Generate Invoice (PDF)"])
        UC5(["View Analytics Dashboard"])
        UC6(["Chat with AI Assistant"])
    end
    
    StoreOwner --> UC1
    StoreOwner --> UC2
    StoreOwner --> UC3
    StoreOwner --> UC4
    StoreOwner --> UC5
    StoreOwner --> UC6
    
    Staff --> UC1
    Staff --> UC2
    Staff --> UC4
```

---

## ⏱ Sequence Diagram

```mermaid
sequenceDiagram
    participant User as Store User
    participant App as PWA (React)
    participant LocalDB as IndexedDB
    participant Worker as Service Worker
    participant Cloud as Firebase Firestore

    User->>App: Completes Sale
    App->>LocalDB: Save transaction (status: pending_sync)
    App-->>User: Success UI (Instant)
    
    opt When Internet is Offline
        App->>Worker: Register Background Sync
    end
    
    loop Network Available
        Worker->>LocalDB: Fetch pending_sync transactions
        LocalDB-->>Worker: Transactions data
        Worker->>Cloud: Batch write transactions
        Cloud-->>Worker: Acknowledge Success
        Worker->>LocalDB: Update status to 'synced'
        LocalDB-->>App: Trigger state update event
    end
```

---

## 💻 Tech Stack
* **Framework:** React 18 with Vite
* **Language:** TypeScript
* **State Management:** Zustand (with local storage persistence)
* **Styling:** Tailwind CSS + Framer Motion
* **Database & Auth:** Firebase (Firestore, Auth, Storage)
* **Offline Storage:** IndexedDB (via `idb`)
* **AI Integration:** Groq (Llama 3), Google Gemini, Heuristic Regex Parsing

---

## 🚀 Run & Execution
1. **Clone the repository:**
   ```bash
   git clone https://github.com/kholipha-ahmmad-al-amin/EquiPulse-Ai.git
   cd EquiPulse-Ai
   ```
2. **Install Dependencies:**
   ```bash
   npm install
   ```
3. **Run Development Server:**
   ```bash
   npm run dev
   ```

---

## Team : EquiSaaS BD :
**Bangladesh's First Open Tech Cooperative**

### Members:

🇧🇩<br/>
**Sandipta Karmakar**<br/>
Project Coordinator<br/><br/>
🇧🇩<br/>
**Kholipha Ahmmad Al-Amin**<br/>
Backend / Database / Scraper Engineer<br/>
Team Leader / Project Coordinator<br/><br/>
🇧🇩<br/>
**Abu Hurayra**<br/>
UI/UX / Frontend Developer<br/>
Presentation / Communication Lead<br/><br/>
🇧🇩<br/>
**Jannatul Nayeem**<br/>
Presentation / Communication Lead<br/><br/>
🇧🇩<br/>
**Sanzida Rahman**<br/>
Member<br/>
UI/UX / Frontend Developer<br/>

---

<div align="center">
  <p>Built with ❤️ by EquiSaaS BD</p>
</div>
