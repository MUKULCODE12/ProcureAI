# ProcureAI — Comprehensive Technical Documentation

---

## 1. Executive Summary

**ProcureAI** is an autonomous AI Purchasing Agent designed for retail and quick-commerce operations. Quick-commerce companies manage ultra-fast fulfillment from dark stores and distribution centers across tight supply constraints. 

In traditional buyer workflows, human planners manually examine inventory levels, sales velocity, incoming open purchase orders (POs), supplier lead times, minimum order quantities (MOQs), warehouse pallet space, and department budgets. This manual review process is error-prone, slow, and unable to react dynamically to real-time sales anomalies or supplier fulfillment bottlenecks.

ProcureAI automates this entire decision cycle:
1. **Investigates** purchasing contexts and operational data via structured agent tools.
2. **Audits Multi-Factor Constraints** (Storage Space, Monthly Budget Caps, Supplier MOQs, Lead-Time Stockout Windows, Financial Delegation Thresholds).
3. **Executes Procurement Actions** (Creating POs, modifying quantities, splitting orders across secondary suppliers, or expediting air freight).
4. **Validates Decisions** through an autonomous **Feedback & Validation Loop** with self-correction.
5. **Measures Operational Reliability** via an automated **Evaluation Benchmark Suite**.

---

## 2. System Architecture

```
 ┌─────────────────────────────────────────────────────────────────────────┐
 │                      ProcureAI Interactive Frontend                     │
 │   ┌──────────────────────┬──────────────────────┬───────────────────┐   │
 │   │   Scenario Studio    │ Warehouse Workbench  │ Evaluation Suite  │   │
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

## 3. End-to-End Scenario Workflows

### Scenario 1 — Purchase Recommendation Review
- **Situation**: System recommends purchasing **800 units** of Fresh Whole Milk (SKU-101) for the Delhi North Dark Store.
- **Investigation**:
  - Current On-Hand Stock: 150 units
  - Avg Daily Sales: 60 units/day
  - Incoming Open POs: 100 units
  - Target Coverage (12 days): 720 units
  - Raw Calculated Net Requirement: 470 units
  - Available Warehouse Storage Space: **450 units**
  - Available Monthly Budget: **$1,500.00** (800 units @ $2.50 = $2,000 -> breach)
- **Agent Decision**: **MODIFY**
- **Action**: Safely caps purchase order at **400 units** ($1,000 total cost). Fits 100% within storage capacity and remaining budget while maintaining a 7-day safety stock buffer.

---

### Scenario 2 — Supplier Cannot Fulfil the Purchase
- **Situation**: PO created for **500 units** with primary supplier DairyFresh Co., but supplier notifies that only **250 units** can currently be supplied (250 unit deficit).
- **Investigation**:
  - Effective stock with partial delivery (150 + 250 = 400 units) provides only **4.2 days** of stock coverage.
  - Stockout predicted in < 5 days if remaining 250 units are unfulfilled.
  - Primary supplier lead time: 2 days.
  - Secondary supplier identified: **FarmDirect Logistics** (Lead time: 3 days, MOQ: 100, Price: $2.70/unit, Reliability: 92%).
- **Agent Decision**: **SPLIT PO**
- **Action**: Accepts 250 units from DairyFresh Co. (PO-2026-003) and immediately issues a split PO for the remaining 250 units to FarmDirect Logistics (PO-2026-004), preventing stockouts without over-purchasing.

---

### Scenario 3 — Demand / Forecast Has Changed (Sales Spike Anomaly)
- **Situation**: POS sales data indicates a sudden **+150% demand surge** for Red Bull Energy Drinks (SKU-103) due to a local promotional event.
- **Investigation**:
  - Baseline Demand: 40 units/day -> Effective Surge Demand: **100 units/day**.
  - Current On-Hand: 120 units; Open PO: 200 units (Total Pipeline: 320 units).
  - Stockout Horizon: `320 / 100 = 3.2 days`!
  - Regular Supplier Lead Time: 3 days (High risk of stockout during re-order gap).
  - Express Supplier Identified: **ExpressBev Fast Track** (Air express, Lead time: 1 day, Unit price: $10.50).
- **Agent Decision**: **EXPEDITE**
- **Action**: Issues an emergency express PO for **450 units** via ExpressBev Fast Track, maintaining 100% stock availability.

---

### Scenario 4 — Purchasing Constraint & Delegation Escalation
- **Situation**: System recommends purchasing **1,000 units** of Organic Eggs (SKU-104) @ $4.00/unit = **$4,000 total**. Primary supplier Golden Egg Farms has a strict MOQ of 800 units ($3,200 total).
- **Investigation**:
  - Single-buyer financial delegation sign-off cap: **$2,500.00**.
  - Both options ($4,000 and $3,200) breach the buyer's delegated spending authority.
- **Agent Decision**: **ESCALATE FOR HUMAN APPROVAL**
- **Action**: Pauses automated PO creation, logs audit trail, and submits a structured proposal to the buyer with a **1-click sign-off modal** in the UI.

---

## 4. Feedback & Validation Loop Design

The **Feedback & Validation Loop** (`lib/agent/validator.ts`) acts as an independent compliance guardrail:

```
Proposed Action ──► [FeedbackLoopValidator]
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   [MOQ Check]   [Storage Check]   [Budget Check]
        │                │                │
        └────────────────┼────────────────┘
                         ▼
                Valid (Score 100)?
               /                  \
             YES                   NO
             /                      \
    Execute Action          Diagnostic Feedback ──► [Self-Correction]
    & Update DB             (e.g., Cap at Storage)        │
                                                          └─► Re-run Validation
```

### Constraint Audit Mechanics:
1. **MOQ Rule**: `proposedQty >= supplier.moq`
2. **Storage Rule**: `proposedQty <= maxCapacityUnits - currentUnitsUsed`
3. **Budget Rule**: `proposedQty * unitPrice <= monthlyBudget - budgetUsed`
4. **Financial Authority Rule**: `totalCost <= $2,500`
5. **Stockout Risk Window**: `(onHand + proposedQty) / dailyDemand >= leadTimeDays`

When an initial action breaches a rule, `FeedbackLoopValidator` returns a diagnostic feedback code (`REDUCE_QUANTITY`, `INCREASE_TO_MOQ`, or `SPLIT_TO_SECONDARY_SUPPLIER`). The Agent Engine automatically adjusts parameters, re-executes, and verifies 100% compliance.

---

## 5. Evaluation & Benchmark Approach

The built-in **Evaluation Suite** (`lib/agent/evaluation.ts`) quantitatively tests agent reliability across 5 core criteria:

| Criterion | Evaluation Metric | Benchmark Goal |
| :--- | :--- | :--- |
| **Information Gathering** | Verification of complete tool call history for inventory, forecast, suppliers, and constraints. | Pass (≥ 2 tool calls) |
| **Constraint Respect** | Zero uncorrected breaches of storage space, budget caps, or supplier MOQs. | 100% Adherence |
| **Action Correctness** | Alignment of agent decision with expected strategic outcome (`MODIFY`, `SPLIT`, `EXPEDITE`, `ESCALATE`). | 100% Match |
| **Result Validation** | Execution of Feedback Validator audit with check metrics. | 100% Audited |
| **Self-Correction Recovery** | Recovery rate when initial inputs violate hard constraints. | 100% Recovery |

---

## 6. API Specifications

### `POST /api/scenario/run`
Runs a scenario execution through the Agent Engine.
- **Request Body**:
  ```json
  {
    "scenarioId": "SCENARIO-1",
    "surgeMultiplier": 1.0
  }
  ```
- **Response**:
  ```json
  {
    "scenarioId": "SCENARIO-1",
    "decision": "MODIFIED",
    "title": "Recommendation Review - Modified Quantity",
    "summaryReasoning": "System recommended purchasing 800 units...",
    "recommendedQty": 800,
    "finalQty": 400,
    "auditTrail": [...],
    "generatedPOs": [...],
    "validationResult": { "isValid": true, "score": 100, "checks": [...] },
    "requiresHumanApproval": false
  }
  ```

### `GET /api/evaluate`
Runs the automated benchmark suite across all scenarios and returns quantitative metrics.

### `POST /api/scenario/reset`
Resets the mock database to initial state.

---

## 7. How to Setup and Run

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### Setup Commands
```bash
# Navigate to project directory
cd procure-ai

# Install dependencies
npm install

# Run local development server
npm run dev

# Test production build
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to access the ProcureAI Interactive Workbench.
