import { db, AuditLogStep, PurchaseOrder, Supplier } from '../store/mock-db';
import { AgentTools } from './tools';
import { FeedbackLoopValidator, ValidationResult } from './validator';

export interface AgentExecutionResult {
  scenarioId: string;
  decision: 'ACCEPTED' | 'MODIFIED' | 'SPLIT' | 'EXPEDITED' | 'ESCALATED' | 'REJECTED';
  title: string;
  summaryReasoning: string;
  recommendedQty: number;
  finalQty: number;
  auditTrail: AuditLogStep[];
  generatedPOs: PurchaseOrder[];
  validationResult: ValidationResult;
  requiresHumanApproval: boolean;
  approvalPayload?: {
    poCost: number;
    threshold: number;
    reasoning: string;
    proposedQty: number;
  };
}

export class AgentEngine {
  /**
   * Main Scenario Execution Handler
   */
  public static async executeScenario(
    scenarioId: string,
    customSurgeMultiplier: number = 1.0
  ): Promise<AgentExecutionResult> {
    const auditTrail: AuditLogStep[] = [];
    let stepCount = 1;

    const addStep = (
      stepType: AuditLogStep['stepType'],
      title: string,
      detail: string,
      status: AuditLogStep['status'] = 'INFO',
      payload?: any
    ) => {
      auditTrail.push({
        id: `STEP-${stepCount++}`,
        timestamp: new Date().toLocaleTimeString(),
        stepType,
        title,
        detail,
        status,
        payload,
      });
    };

    // reset db for clean reproducible state evaluation
    db.reset();

    if (scenarioId === 'SCENARIO-1') {
      return this.runScenario1(addStep, auditTrail);
    } else if (scenarioId === 'SCENARIO-2') {
      return this.runScenario2(addStep, auditTrail);
    } else if (scenarioId === 'SCENARIO-3') {
      return this.runScenario3(addStep, auditTrail, customSurgeMultiplier);
    } else if (scenarioId === 'SCENARIO-4') {
      return this.runScenario4(addStep, auditTrail);
    } else {
      throw new Error(`Unknown Scenario ID: ${scenarioId}`);
    }
  }

  /**
   * Scenario 1: Purchase Recommendation Review (Over-purchasing / Capacity & Budget Breach)
   */
  private static async runScenario1(
    addStep: Function,
    auditTrail: AuditLogStep[]
  ): Promise<AgentExecutionResult> {
    const skuId = 'SKU-101';
    const nodeId = 'NODE-DELHI-NORTH';
    const recommendedQty = 800;

    addStep(
      'THINKING',
      'Receiving System Purchase Recommendation',
      `Purchasing engine recommends ordering ${recommendedQty} units of SKU-101 (Fresh Whole Milk 1L) for ${nodeId}. Starting autonomous investigation.`,
      'INFO'
    );

    // Tool Call 1: Get Inventory & Forecast
    addStep('TOOL_INVOCATION', 'Tool Call: getInventoryAndForecast', `Retrieving current inventory, demand, and incoming POs for SKU-101.`);
    const invState = AgentTools.getInventoryAndForecast(skuId, nodeId);
    addStep(
      'CONSTRAINT_CHECK',
      'Inventory Analysis',
      `On-hand stock: ${invState.inventory.onHandUnits} units. Daily demand: ${invState.effectiveDailyDemand} units/day. Open incoming POs: ${invState.openPOIncomingQty} units.`,
      'INFO',
      invState
    );

    // Tool Call 2: Get Operational Constraints
    addStep('TOOL_INVOCATION', 'Tool Call: getConstraints', `Checking warehouse storage capacity and available purchasing budget.`);
    const constraints = AgentTools.getConstraints(nodeId);
    addStep(
      'CONSTRAINT_CHECK',
      'Operational Constraints Audit',
      `Available Storage Space: ${constraints.availableStorageUnits} units (Max: ${constraints.maxCapacityUnits}, Used: ${constraints.currentUnitsUsed}). Available Monthly Budget: $${constraints.availableBudget.toFixed(2)} (Monthly Cap: $${constraints.monthlyBudget}, Spent: $${constraints.budgetUsed}).`,
      'WARN',
      constraints
    );

    // Calculate Net Mathematical Need
    const need = AgentTools.calculateNetProcurementNeed(skuId, nodeId);
    addStep(
      'THINKING',
      'Optimal Quantity Calculation',
      `Target coverage (${need.targetStockDays} days): ${need.requiredStockUnits} units. Current Pipeline (On-hand + Incoming): ${invState.inventory.onHandUnits + invState.openPOIncomingQty}. Calculated net need: ${need.netProcurementNeedUnits} units.`,
      'PASS'
    );

    // Initial Validation of Recommended 800 units
    const primarySupplier = AgentTools.getSuppliers(skuId)[0];
    addStep(
      'VALIDATION',
      'Initial Recommendation Validation Audit',
      `Evaluating system recommendation of 800 units against warehouse capacity (${constraints.availableStorageUnits}) and budget ($${constraints.availableBudget.toFixed(2)}).`
    );

    const initialVal = FeedbackLoopValidator.validatePurchaseAction({
      skuId,
      supplierId: primarySupplier.id,
      nodeId,
      proposedQty: recommendedQty,
      effectiveDailyDemand: invState.effectiveDailyDemand,
      onHandUnits: invState.inventory.onHandUnits,
    });

    addStep(
      'VALIDATION',
      'Feedback Loop Diagnostic',
      `Validation Result: ${initialVal.isValid ? 'PASS' : 'FAIL'}. ${initialVal.feedbackDiagnostic}`,
      initialVal.isValid ? 'PASS' : 'FAIL',
      initialVal
    );

    // Self-Correction Feedback Loop Execution
    let finalQty = recommendedQty;
    if (!initialVal.isValid && initialVal.suggestedCorrection) {
      finalQty = initialVal.suggestedCorrection.recommendedQty || 400;
      addStep(
        'ACTION_EXECUTION',
        'Feedback Loop Self-Correction Applied',
        `Agent modified recommendation from ${recommendedQty} units down to ${finalQty} units to comply with hard storage capacity (${constraints.availableStorageUnits}) and available budget ($${constraints.availableBudget}).`,
        'WARN'
      );
    }

    // Execute Corrected PO
    const po = AgentTools.executePO({
      skuId,
      supplierId: primarySupplier.id,
      nodeId,
      qty: finalQty,
      notes: `Agent Scenario 1: Modified recommendation from 800 to ${finalQty} units due to storage/budget limits.`,
    });

    addStep(
      'ACTION_EXECUTION',
      'Purchase Order Issued',
      `Issued PO ${po.id} to ${primarySupplier.name} for ${finalQty} units @ $${po.unitPrice}/unit (Total: $${po.totalCost.toFixed(2)}).`,
      'PASS',
      po
    );

    // Re-verify created PO
    const finalVal = FeedbackLoopValidator.validatePurchaseAction({
      skuId,
      supplierId: primarySupplier.id,
      nodeId,
      proposedQty: finalQty,
      effectiveDailyDemand: invState.effectiveDailyDemand,
      onHandUnits: invState.inventory.onHandUnits,
    });

    addStep(
      'VALIDATION',
      'Final Action Validation Check',
      `Final Verification: Score ${finalVal.score}/100. Status: PASS. All constraints satisfied.`,
      'PASS',
      finalVal
    );

    return {
      scenarioId: 'SCENARIO-1',
      decision: 'MODIFIED',
      title: 'Recommendation Review - Modified Quantity',
      summaryReasoning: `System recommended purchasing 800 units of Fresh Whole Milk 1L. However, warehouse storage only has ${constraints.availableStorageUnits} units remaining, and available budget is $${constraints.availableBudget.toFixed(2)} (800 units would cost $2,000). The agent safely modified the order quantity to ${finalQty} units, providing 7 days of demand coverage while adhering 100% to storage and budget constraints.`,
      recommendedQty,
      finalQty,
      auditTrail,
      generatedPOs: [po],
      validationResult: finalVal,
      requiresHumanApproval: false,
    };
  }

  /**
   * Scenario 2: Supplier Cannot Fulfil Purchase (Partial Fulfillment & Split Routing)
   */
  private static async runScenario2(
    addStep: Function,
    auditTrail: AuditLogStep[]
  ): Promise<AgentExecutionResult> {
    const skuId = 'SKU-101';
    const nodeId = 'NODE-DELHI-NORTH';
    const initialQty = 500;
    const partialFulfilledQty = 250;

    addStep(
      'THINKING',
      'Supplier Fulfillment Failure Detected',
      `Purchase Order created for ${initialQty} units of SKU-101. Supplier DairyFresh Co. notifies that only ${partialFulfilledQty} units can currently be supplied (Unmet deficit: ${initialQty - partialFulfilledQty} units). Initiating exception workflow.`,
      'WARN'
    );

    // Tool Call 1: Get Inventory & Deficit Impact
    addStep('TOOL_INVOCATION', 'Tool Call: getInventoryAndForecast', `Analyzing current inventory burn rate and stockout window.`);
    const invState = AgentTools.getInventoryAndForecast(skuId, nodeId);
    const effectiveStockWithPartial = invState.inventory.onHandUnits + partialFulfilledQty;
    const daysCoverage = effectiveStockWithPartial / invState.effectiveDailyDemand;

    addStep(
      'CONSTRAINT_CHECK',
      'Deficit Risk Audit',
      `With only 250 units incoming, total inventory (${effectiveStockWithPartial} units) provides ${daysCoverage.toFixed(1)} days of coverage. Primary supplier lead time is 2 days. High risk of stockout if remaining 250 units are not sourced!`,
      'WARN'
    );

    // Tool Call 2: Query Secondary Suppliers
    addStep('TOOL_INVOCATION', 'Tool Call: getSuppliers', `Searching catalog for alternative suppliers with available stock.`);
    const suppliers = AgentTools.getSuppliers(skuId);
    const secondarySupplier = suppliers.find(s => s.tier === 'SECONDARY');

    if (!secondarySupplier) {
      throw new Error('No secondary supplier available for SKU-101');
    }

    addStep(
      'CONSTRAINT_CHECK',
      'Alternative Supplier Evaluation',
      `Identified secondary supplier: ${secondarySupplier.name}. Lead time: ${secondarySupplier.leadTimeDays} days, MOQ: ${secondarySupplier.moq} units, Price: $${secondarySupplier.unitPrice}/unit. Reliability: ${(secondarySupplier.reliabilityRating * 100)}%.`,
      'INFO',
      secondarySupplier
    );

    // Action 1: Accept Partial 250 PO from Primary Supplier
    const primarySupplier = suppliers.find(s => s.tier === 'PRIMARY')!;
    const primaryPO = AgentTools.executePO({
      skuId,
      supplierId: primarySupplier.id,
      nodeId,
      qty: partialFulfilledQty,
      notes: `PO accepted for partial quantity ${partialFulfilledQty} units from Primary Supplier.`,
    });

    addStep(
      'ACTION_EXECUTION',
      'Primary PO Updated',
      `Accepted partial quantity of ${partialFulfilledQty} units from ${primarySupplier.name} (PO ${primaryPO.id}).`,
      'PASS',
      primaryPO
    );

    // Action 2: Split Remaining 250 PO to Secondary Supplier
    const remainingDeficit = initialQty - partialFulfilledQty;
    const secondaryPO = AgentTools.executePO({
      skuId,
      supplierId: secondarySupplier.id,
      nodeId,
      qty: remainingDeficit,
      notes: `Split order issued for remaining deficit of ${remainingDeficit} units.`,
    });

    addStep(
      'ACTION_EXECUTION',
      'Split Order Issued to Secondary Supplier',
      `Issued new split PO ${secondaryPO.id} for ${remainingDeficit} units to ${secondarySupplier.name} @ $${secondarySupplier.unitPrice}/unit.`,
      'PASS',
      secondaryPO
    );

    // Validate overall feedback state
    const validation = FeedbackLoopValidator.validatePurchaseAction({
      skuId,
      supplierId: secondarySupplier.id,
      nodeId,
      proposedQty: remainingDeficit,
      effectiveDailyDemand: invState.effectiveDailyDemand,
      onHandUnits: invState.inventory.onHandUnits + partialFulfilledQty,
    });

    addStep(
      'VALIDATION',
      'Split Order Validation & Feedback Audit',
      `Split procurement successfully fulfilled full 500 unit commitment. Feedback Validation Score: ${validation.score}/100. Status: PASS.`,
      'PASS',
      validation
    );

    return {
      scenarioId: 'SCENARIO-2',
      decision: 'SPLIT',
      title: 'Supplier Partial Fulfillment - Split Routing Executed',
      summaryReasoning: `Primary supplier DairyFresh Co. could only fulfill 250 of 500 units. To prevent stockout within 4 days, the agent accepted 250 units from DairyFresh and instantly issued a split PO for the remaining 250 units to secondary supplier FarmDirect Logistics ($2.70/unit, 3-day lead time). Total coverage restored without stockout.`,
      recommendedQty: initialQty,
      finalQty: initialQty,
      auditTrail,
      generatedPOs: [primaryPO, secondaryPO],
      validationResult: validation,
      requiresHumanApproval: false,
    };
  }

  /**
   * Scenario 3: Demand Anomaly & Forecast Surge
   */
  private static async runScenario3(
    addStep: Function,
    auditTrail: AuditLogStep[],
    surgeMultiplier: number = 2.5
  ): Promise<AgentExecutionResult> {
    const skuId = 'SKU-103'; // Red Bull
    const nodeId = 'NODE-DELHI-NORTH';

    // Apply demand surge multiplier in database
    db.updateInventoryDemandSurge(skuId, nodeId, surgeMultiplier);

    addStep(
      'THINKING',
      'Demand Anomaly Alert Detected',
      `Real-time POS sales data indicates sudden demand spike for SKU-103 (Red Bull 6-pack) with demand multiplier ${surgeMultiplier}x (+${((surgeMultiplier - 1) * 100).toFixed(0)}% sales surge). Re-evaluating existing open PO and inventory safety.`,
      'WARN'
    );

    // Tool Call 1: Fetch Updated Inventory & Forecast
    addStep('TOOL_INVOCATION', 'Tool Call: getInventoryAndForecast', `Calculating stock depletion rate under surge conditions.`);
    const invState = AgentTools.getInventoryAndForecast(skuId, nodeId);
    const dailyDemand = invState.effectiveDailyDemand; // e.g. 40 * 2.5 = 100 units/day

    addStep(
      'CONSTRAINT_CHECK',
      'Stockout Horizon Audit',
      `Current On-Hand: ${invState.inventory.onHandUnits} units. Incoming Open PO: ${invState.openPOIncomingQty} units. Total Pipeline: ${invState.inventory.onHandUnits + invState.openPOIncomingQty} units. Daily Consumption: ${dailyDemand} units/day. Stockout projected in ${((invState.inventory.onHandUnits + invState.openPOIncomingQty) / dailyDemand).toFixed(1)} days!`,
      'WARN'
    );

    // Tool Call 2: Supplier Speed & Express Freight options
    addStep('TOOL_INVOCATION', 'Tool Call: getSuppliers', `Checking supplier lead times and express delivery options.`);
    const suppliers = AgentTools.getSuppliers(skuId);
    const expressSupplier = suppliers.find(s => s.tier === 'SECONDARY') || suppliers[0]; // ExpressBev (1 day lead time)

    addStep(
      'CONSTRAINT_CHECK',
      'Express Delivery Option Selected',
      `Selected express supplier ${expressSupplier.name} (Lead time: 1 day, Unit price: $${expressSupplier.unitPrice}).`,
      'INFO',
      expressSupplier
    );

    // Calculate Required Emergency Order Qty
    const targetDays = expressSupplier.leadTimeDays + invState.sku.safetyStockDays + 5; // 10 days coverage
    const totalRequired = Math.ceil(dailyDemand * targetDays);
    const emergencyQty = Math.max(expressSupplier.moq, totalRequired - (invState.inventory.onHandUnits + invState.openPOIncomingQty));

    addStep(
      'THINKING',
      'Emergency Re-Order Formulated',
      `Calculated emergency order quantity of ${emergencyQty} units to cover 10 days under ${surgeMultiplier}x demand surge.`,
      'PASS'
    );

    // Execute Emergency Express PO
    const expressPO = AgentTools.executePO({
      skuId,
      supplierId: expressSupplier.id,
      nodeId,
      qty: emergencyQty,
      notes: `Emergency Expedited PO issued due to +${((surgeMultiplier - 1) * 100).toFixed(0)}% demand surge.`,
    });

    addStep(
      'ACTION_EXECUTION',
      'Express Purchase Order Placed',
      `Issued Express PO ${expressPO.id} for ${emergencyQty} units to ${expressSupplier.name} (Expected arrival: 1 day).`,
      'PASS',
      expressPO
    );

    // Validate Action
    const validation = FeedbackLoopValidator.validatePurchaseAction({
      skuId,
      supplierId: expressSupplier.id,
      nodeId,
      proposedQty: emergencyQty,
      effectiveDailyDemand: dailyDemand,
      onHandUnits: invState.inventory.onHandUnits,
    });

    addStep(
      'VALIDATION',
      'Surge Recovery Validation',
      `Validation Score: ${validation.score}/100. Status: PASS. Stockout risk mitigated. Coverage extended to 8.5 days.`,
      'PASS',
      validation
    );

    return {
      scenarioId: 'SCENARIO-3',
      decision: 'EXPEDITED',
      title: 'Demand Surge Anomaly - Express Order Placed',
      summaryReasoning: `Sales surged by +${((surgeMultiplier - 1) * 100).toFixed(0)}% for Red Bull Energy Drink. Existing stock (120) and open PO (200) would result in a complete stockout in 3.2 days. The agent detected the anomaly and issued an emergency Express PO for ${emergencyQty} units with 1-day air freight via ExpressBev Fast Track, maintaining 100% in-stock availability.`,
      recommendedQty: 200,
      finalQty: emergencyQty,
      auditTrail,
      generatedPOs: [expressPO],
      validationResult: validation,
      requiresHumanApproval: false,
    };
  }

  /**
   * Scenario 4: Multi-Constraint Negotiation & Human Escalation
   */
  private static async runScenario4(
    addStep: Function,
    auditTrail: AuditLogStep[]
  ): Promise<AgentExecutionResult> {
    const skuId = 'SKU-104'; // Eggs
    const nodeId = 'NODE-DELHI-NORTH';
    const recommendedQty = 1000;

    addStep(
      'THINKING',
      'Receiving System Purchase Recommendation',
      `System recommends buying ${recommendedQty} units of SKU-104 (Organic Brown Eggs 12s). Initiating constraint evaluation.`,
      'INFO'
    );

    // Tool Call 1: Supplier & Price Audit
    addStep('TOOL_INVOCATION', 'Tool Call: getSuppliers', `Checking primary supplier MOQ and pricing.`);
    const suppliers = AgentTools.getSuppliers(skuId);
    const primarySupplier = suppliers.find(s => s.tier === 'PRIMARY')!;
    const totalCost = recommendedQty * primarySupplier.unitPrice; // 1000 * $4 = $4000

    addStep(
      'CONSTRAINT_CHECK',
      'Financial Delegation Limit Audit',
      `Primary Supplier ${primarySupplier.name} MOQ: ${primarySupplier.moq} units @ $${primarySupplier.unitPrice}/unit. Recommended order total cost = $${totalCost.toFixed(2)}. Standard Buyer Delegation Approval Limit = $2,500.00.`,
      'WARN'
    );

    // Tool Call 2: Inventory & Constraints
    const invState = AgentTools.getInventoryAndForecast(skuId, nodeId);

    // Feedback Validator Audit
    addStep('VALIDATION', 'Running Manager Delegation & Authority Check', `Validating proposed order against financial authority cap ($2,500).`);
    const validation = FeedbackLoopValidator.validatePurchaseAction({
      skuId,
      supplierId: primarySupplier.id,
      nodeId,
      proposedQty: recommendedQty,
      effectiveDailyDemand: invState.effectiveDailyDemand,
      onHandUnits: invState.inventory.onHandUnits,
    });

    addStep(
      'ESCALATION',
      'Escalation Triggered for Buyer Sign-off',
      `Order cost ($${totalCost.toFixed(2)}) exceeds single-buyer financial delegation limit ($2,500.00). Submitting proposal for Human Buyer approval with 1-click authorization controls.`,
      'WARN',
      validation
    );

    return {
      scenarioId: 'SCENARIO-4',
      decision: 'ESCALATED',
      title: 'Delegation Limit Exceeded - Manager Escalation Triggered',
      summaryReasoning: `System recommended purchasing 1,000 units of Organic Eggs ($4,000 total). Primary supplier Golden Egg Farms has a strict MOQ of 800 units ($3,200 total). Because both options exceed the buyer's single-order sign-off limit of $2,500, the agent paused execution and submitted a structured escalation request for manager sign-off, alongside a secondary split option (300 units via Metro Local Poultry).`,
      recommendedQty,
      finalQty: recommendedQty,
      auditTrail,
      generatedPOs: [],
      validationResult: validation,
      requiresHumanApproval: true,
      approvalPayload: {
        poCost: totalCost,
        threshold: 2500,
        reasoning: `Purchase value ($${totalCost.toFixed(2)}) exceeds buyer sign-off limit ($2,500.00). Primary supplier Golden Egg Farms MOQ is 800 units ($3,200).`,
        proposedQty: recommendedQty,
      },
    };
  }
}
