# ProcureAI — Autonomous AI Purchasing Agent for Retail & Quick-Commerce

[![Next.js](https://img.shields.io/badge/Framework-Next.js%2016-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS%20v4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Build Status](https://img.shields.io/badge/Build-PASSING-emerald?style=flat-square)](#)

ProcureAI is a full-stack, state-of-the-art AI Purchasing Agent designed to automate buyer workflows in retail and quick-commerce environments. 

It investigates purchasing situations, queries inventory & demand forecasts, respects multi-factorial constraints (Storage Capacity, Purchasing Budgets, Supplier MOQs, Lead-time stockout horizons), executes actions, and validates decisions via an **Autonomous Feedback & Validation Loop**.

---

## 🌟 Key Features

1. **4 End-to-End Operational Scenarios**:
   - **Scenario 1 (Recommendation Review)**: Evaluates an 800-unit recommendation against storage (450 unit cap) & budget limits ($1,500 available), safely modifying the order to 400 units.
   - **Scenario 2 (Supplier Partial Fulfillment & Order Splitting)**: Primary supplier accepts only 250 of 500 units. The agent accepts 250 units and issues a split PO for the remaining 250 units to a secondary supplier before stockout occurs.
   - **Scenario 3 (Demand Anomaly & Forecast Surge)**: Detects a +150% sales surge on Energy Drinks, calculates stockout risk horizon (3 days), and places an express air-freight PO with 1-day lead time.
   - **Scenario 4 (Multi-Constraint & Human Delegation Escalation)**: Detects an order exceeding single-buyer financial delegation limits ($2,500), pausing execution for one-click manager sign-off with fallback options.

2. **Autonomous Feedback & Validation Loop Engine**:
   - Every action (PO creation, quantity modification, order split) is passed through an independent multi-constraint validator.
   - If a constraint is breached, the feedback loop triggers **Self-Correction**, adjusts parameters, and re-validates.

3. **Automated Evaluation Benchmark Suite**:
   - Quantitative evaluation matrix scoring 5 key dimensions:
     - Information Gathering completeness
     - Constraint Verification adherence
     - Action Strategy correctness
     - Result Validation audit
     - Self-Correction recovery rate

4. **Interactive Quick-Commerce Workbench**:
   - Live visual gauges for Dark Store warehouse capacity & monthly purchasing budget.
   - Active SKU inventory tracking & Open Purchase Order registry.

---

## 🏗 System Architecture

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                      ProcureAI Interactive Frontend                     │
 │   ┌──────────────────────┬──────────────────────┬───────────────────┐   │
 │   │  Scenario Studio     │ Warehouse Workbench  │ Evaluation Suite  │   │
 │   └──────────────────────┴──────────────────────┴───────────────────┘   │
 └────────────────────────────────────┬────────────────────────────────────┘
                                      │ REST API / Client State
 ┌────────────────────────────────────▼────────────────────────────────────┐
 │                            Next.js Backend                              │
 │  ┌───────────────────────────────────────────────────────────────────┐  │
 │  │                         Agent Orchestrator                        │  │
 │  │   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────┐  │  │
 │  │   │ Reasoning Engine │──►│   Tool Executor  │──►│ Risk Evaluator│  │  │
 │  │   └──────────────────┘   └──────────────────┘   └──────────────┘  │  │
 │  └─────────────────────────────────┬─────────────────────────────────┘  │
 │                                    │                                    │
 │  ┌─────────────────────────────────▼─────────────────────────────────┐  │
 │  │                 Feedback & Validation Loop Engine                 │  │
 │  │  Executes Action ──► Assesses Operational Constraints ──► Feedback │  │
 │  └─────────────────────────────────┬─────────────────────────────────┘  │
 └────────────────────────────────────┼────────────────────────────────────┘
                                      │
 ┌────────────────────────────────────▼────────────────────────────────────┐
 │                     Mock Operational Data Store                         │
 │   [SKU Catalog]   [Fulfillment Nodes]   [Suppliers]   [Open POs]        │
 │   [Inventory]     [Demand Forecasts]    [Budgets]     [Storage Caps]    │
 └─────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Guide

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 1. Installation
Clone the repository and install dependencies:
```bash
cd procure-ai
npm install
```

### 2. Running Locally (Dev Server)
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Test
Validate compilation:
```bash
npm run build
npm run start
```

---

## 🛠 Agent Tools & Domain APIs

The agent interacts with the operational environment via structured tool contracts (`lib/agent/tools.ts`):

| Tool Name | Purpose |
| :--- | :--- |
| `getInventoryAndForecast` | Returns on-hand inventory, open PO pipeline, safety stock, and daily demand burn rate. |
| `getSuppliers` | Queries primary and secondary suppliers, lead times, MOQs, unit prices, and reliability ratings. |
| `getConstraints` | Returns available warehouse unit capacity and remaining monthly purchasing budget. |
| `calculateNetProcurementNeed` | Computes exact mathematical replenishment required over lead time + safety stock. |
| `executePO` | Generates a new purchase order and updates warehouse financial/storage metrics. |
| `validatePurchaseAction` | Runs the Feedback & Validation Engine against hard operational rules. |

---

## 🔄 Feedback & Validation Design

When ProcureAI executes an action, it does not assume success. The action payload is passed to `FeedbackLoopValidator`:

1. **Rule Audits**:
   - **MOQ Check**: `orderQty >= supplier.moq`
   - **Storage Capacity Check**: `orderQty <= availableWarehouseStorage`
   - **Purchasing Budget Check**: `totalCost <= availableBudget`
   - **Buyer Financial Limit Check**: `totalCost <= $2,500`
   - **Lead Time Stockout Risk**: `(onHand + orderQty) / dailyDemand >= leadTimeDays`

2. **Self-Correction & Fallback Loop**:
   - If a rule fails (e.g. 800 units exceeds 450 unit storage space), `FeedbackLoopValidator` provides diagnostic feedback (`REDUCE_QUANTITY` or `SPLIT_TO_SECONDARY_SUPPLIER`).
   - The Agent Engine automatically applies the correction, re-issues the action, and re-validates until a valid decision state is reached (Score 100/100).

---

## 📊 Evaluation & Benchmark Approach

The built-in **Evaluation Suite** (`lib/agent/evaluation.ts`) quantitatively evaluates agent reliability across 5 core criteria:

- **Was the decision correct?** Verifies strategic decision alignment (`MODIFY`, `SPLIT`, `EXPEDITE`, `ESCALATE`).
- **Did the agent obtain necessary information?** Assesses tool call completeness.
- **Did it respect relevant constraints?** Verifies 0 hard rule violations.
- **Did it validate the result?** Verifies validator audit completion.
- **How does it handle initial failures?** Measures self-correction recovery success rate.

---

## 📁 Repository Structure

```
procure-ai/
├── app/
│   ├── api/
│   │   ├── evaluate/route.ts      # Automated Benchmark Suite API
│   │   ├── scenario/reset/route.ts # Data store reset API
│   │   └── scenario/run/route.ts   # Scenario Execution API
│   ├── globals.css                # Tailwind CSS v4 styling
│   ├── layout.tsx                 # Root layout component
│   └── page.tsx                   # Main workbench container
├── components/
│   ├── Navbar.tsx                 # Header navigation & controls
│   ├── ScenarioRunner.tsx         # Scenario controls, audit trail & approval modal
│   ├── WarehouseWorkbench.tsx     # Inventory, node capacity & PO tables
│   └── EvaluationDashboard.tsx    # Benchmark scorecards & reports
├── lib/
│   ├── agent/
│   │   ├── engine.ts              # Agent reasoning & scenario orchestrator
│   │   ├── evaluation.ts          # Evaluation benchmark runner
│   │   ├── tools.ts               # Agent domain tools & calculation suite
│   │   └── validator.ts           # Feedback loop multi-constraint validator
│   └── store/
│       └── mock-db.ts             # Reactive mock operational database
├── ARCHITECTURE.md                # System architecture documentation
├── README.md                      # Documentation & setup instructions
└── .env.example                   # Environment variable template
```
