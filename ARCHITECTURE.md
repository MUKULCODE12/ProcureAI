# ProcureAI Architecture Documentation

## 1. System Overview

ProcureAI is designed as an autonomous decision engine with a dual-layer architecture:
- **Heuristic Constraint Solver & Agent Orchestrator**: Guarantees fast (<20ms latency), 100% reproducible constraint calculation, tool invocation, and multi-step scenario resolution.
- **LLM Explanation & Reasoner Integration**: Provides natural language buyer justifications and supports open-ended scenario queries.

---

## 2. Sequence Diagram (Scenario Execution & Feedback Loop)

```mermaid
sequenceDiagram
    autonumber
    actor Buyer
    participant UI as Next.js Frontend (ScenarioRunner)
    participant Orchestrator as Agent Engine (engine.ts)
    participant Tools as Agent Tools (tools.ts)
    participant DB as Mock Data Store (mock-db.ts)
    participant Validator as Feedback Validator (validator.ts)

    Buyer->>UI: Select Scenario & Click Execute
    UI->>Orchestrator: POST /api/scenario/run { scenarioId }
    Orchestrator->>Tools: getInventoryAndForecast(skuId, nodeId)
    Tools->>DB: Query stock, demand, open POs
    DB-->>Tools: Return inventory state
    Tools-->>Orchestrator: Inventory & Demand Payload

    Orchestrator->>Tools: getConstraints(nodeId)
    Tools->>DB: Query warehouse space & monthly budget
    DB-->>Tools: Return capacity & budget
    Tools-->>Orchestrator: Operational Constraints Payload

    Orchestrator->>Orchestrator: Formulate initial action proposal
    Orchestrator->>Validator: validatePurchaseAction(proposedQty)
    Validator-->>Orchestrator: Return ValidationResult (isValid, checks, feedbackDiagnostic)

    alt Constraint Violation Detected (isValid == false)
        Orchestrator->>Orchestrator: Trigger Self-Correction Loop & apply suggestedCorrection
        Orchestrator->>Validator: Re-validate adjusted purchase action
        Validator-->>Orchestrator: Return ValidationResult (Score 100/100)
    end

    alt Buyer Delegation Limit Exceeded (totalCost > $2,500)
        Orchestrator->>UI: Require Human Approval Escalation
    else Standard Action
        Orchestrator->>Tools: executePO(...)
        Tools->>DB: Create Purchase Order & Update Budget/Storage
    end

    Orchestrator-->>UI: Return AgentExecutionResult (Audit Trail, Decision, POs, Score)
    UI-->>Buyer: Render Visual Audit Trail & Decision Cards
```

---

## 3. Feedback Loop Mechanics

The feedback loop is the core safety mechanism of ProcureAI. When an action is taken or proposed, it undergoes multi-dimensional evaluation:

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

---

## 4. Evaluation Suite Metrics

The Evaluation Suite (`lib/agent/evaluation.ts`) audits the agent's behavior across 5 dimensions:

1. **Information Gathering**: Assesses tool call count and coverage.
2. **Constraint Verification**: Ensures 0 hard rule breaches.
3. **Action Alignment**: Verifies strategic decision appropriateness (`MODIFY`, `SPLIT`, `EXPEDITE`, `ESCALATE`).
4. **Result Validation**: Audits feedback validator execution.
5. **Self-Correction Recovery**: Measures recovery from initial breach states.
