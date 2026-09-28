import { db, Supplier, FulfillmentNode, SKU } from '../store/mock-db';

export interface ValidationCheckItem {
  rule: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  metric?: {
    current: number;
    limit: number;
    unit: string;
  };
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0 to 100
  checks: ValidationCheckItem[];
  feedbackDiagnostic?: string;
  suggestedCorrection?: {
    action: 'REDUCE_QUANTITY' | 'INCREASE_TO_MOQ' | 'SPLIT_TO_SECONDARY_SUPPLIER' | 'REQUEST_HUMAN_APPROVAL';
    recommendedQty?: number;
    targetSupplierId?: string;
  };
}

export class FeedbackLoopValidator {
  private static BUYER_DELEGATION_LIMIT = 2500; // $2,500 threshold for single-buyer approval

  /**
   * Validate a proposed or executed Purchase Action against operational constraints
   */
  public static validatePurchaseAction(params: {
    skuId: string;
    supplierId: string;
    nodeId: string;
    proposedQty: number;
    effectiveDailyDemand: number;
    onHandUnits: number;
  }): ValidationResult {
    const sku = db.getSKU(params.skuId);
    const supplier = db.getSuppliers().find(s => s.id === params.supplierId);
    const node = db.getNode(params.nodeId);

    if (!sku || !supplier || !node) {
      return {
        isValid: false,
        score: 0,
        checks: [
          { rule: 'Entity Existence Check', status: 'FAIL', message: 'Target SKU, Supplier, or Warehouse Node not found in system database' }
        ],
        feedbackDiagnostic: 'CRITICAL ERROR: Referenced entity does not exist.',
      };
    }

    const checks: ValidationCheckItem[] = [];
    const availableStorage = node.maxCapacityUnits - node.currentUnitsUsed;
    const availableBudget = node.monthlyBudget - node.budgetUsed;
    const totalCost = params.proposedQty * supplier.unitPrice;

    // 1. MOQ Check
    if (params.proposedQty < supplier.moq) {
      checks.push({
        rule: 'Supplier MOQ Requirement',
        status: 'FAIL',
        message: `Order quantity (${params.proposedQty}) is below supplier minimum order quantity (${supplier.moq}).`,
        metric: { current: params.proposedQty, limit: supplier.moq, unit: 'units' },
      });
    } else {
      checks.push({
        rule: 'Supplier MOQ Requirement',
        status: 'PASS',
        message: `Order quantity (${params.proposedQty}) satisfies supplier MOQ (${supplier.moq}).`,
        metric: { current: params.proposedQty, limit: supplier.moq, unit: 'units' },
      });
    }

    // 2. Storage Capacity Check
    if (params.proposedQty > availableStorage) {
      checks.push({
        rule: 'Warehouse Physical Storage Limit',
        status: 'FAIL',
        message: `Order quantity (${params.proposedQty}) exceeds remaining warehouse capacity (${availableStorage} units).`,
        metric: { current: params.proposedQty, limit: availableStorage, unit: 'units' },
      });
    } else {
      checks.push({
        rule: 'Warehouse Physical Storage Limit',
        status: 'PASS',
        message: `Order volume fits safely within available warehouse capacity (${availableStorage} units remaining).`,
        metric: { current: params.proposedQty, limit: availableStorage, unit: 'units' },
      });
    }

    // 3. Purchasing Budget Check
    if (totalCost > availableBudget) {
      checks.push({
        rule: 'Node Monthly Purchasing Budget',
        status: 'FAIL',
        message: `Total cost ($${totalCost.toFixed(2)}) exceeds available monthly budget ($${availableBudget.toFixed(2)}).`,
        metric: { current: totalCost, limit: availableBudget, unit: 'USD' },
      });
    } else {
      checks.push({
        rule: 'Node Monthly Purchasing Budget',
        status: 'PASS',
        message: `Total cost ($${totalCost.toFixed(2)}) is within available budget ($${availableBudget.toFixed(2)}).`,
        metric: { current: totalCost, limit: availableBudget, unit: 'USD' },
      });
    }

    // 4. Buyer Delegation Limit Check
    if (totalCost > this.BUYER_DELEGATION_LIMIT) {
      checks.push({
        rule: 'Single-Buyer Financial Approval Cap',
        status: 'WARN',
        message: `Total order cost ($${totalCost.toFixed(2)}) exceeds standard buyer sign-off cap ($${this.BUYER_DELEGATION_LIMIT}). Requires manager escalation.`,
        metric: { current: totalCost, limit: this.BUYER_DELEGATION_LIMIT, unit: 'USD' },
      });
    } else {
      checks.push({
        rule: 'Single-Buyer Financial Approval Cap',
        status: 'PASS',
        message: `Order value ($${totalCost.toFixed(2)}) is within standard buyer approval delegation limit.`,
        metric: { current: totalCost, limit: this.BUYER_DELEGATION_LIMIT, unit: 'USD' },
      });
    }

    // 5. Stockout Risk Window Check
    const daysOfStockProvided = (params.onHandUnits + params.proposedQty) / (params.effectiveDailyDemand || 1);
    if (daysOfStockProvided < supplier.leadTimeDays) {
      checks.push({
        rule: 'Lead Time Coverage Safety Window',
        status: 'WARN',
        message: `Total coverage (${daysOfStockProvided.toFixed(1)} days) is less than supplier lead time (${supplier.leadTimeDays} days). Stockout risk exists!`,
      });
    } else {
      checks.push({
        rule: 'Lead Time Coverage Safety Window',
        status: 'PASS',
        message: `Total inventory coverage provides ${daysOfStockProvided.toFixed(1)} days of demand protection.`,
      });
    }

    const failedChecks = checks.filter(c => c.status === 'FAIL');
    const warnChecks = checks.filter(c => c.status === 'WARN');
    const isValid = failedChecks.length === 0;

    // Calculate score
    const totalRules = checks.length;
    const passedCount = checks.filter(c => c.status === 'PASS').length;
    const score = Math.round((passedCount / totalRules) * 100);

    // Formulate Diagnostic Feedback & Suggested Corrections
    let feedbackDiagnostic = '';
    let suggestedCorrection: ValidationResult['suggestedCorrection'] = undefined;

    if (!isValid) {
      const storageFail = failedChecks.find(c => c.rule.includes('Storage'));
      const budgetFail = failedChecks.find(c => c.rule.includes('Budget'));
      const moqFail = failedChecks.find(c => c.rule.includes('MOQ'));

      if (storageFail || budgetFail) {
        // Find max feasible quantity based on storage and budget constraints
        const maxUnitsByBudget = Math.floor(availableBudget / supplier.unitPrice);
        const maxFeasibleQty = Math.min(availableStorage, maxUnitsByBudget);

        if (maxFeasibleQty < supplier.moq) {
          feedbackDiagnostic = `FEEDBACK LOOP ALARM: Neither storage (${availableStorage}) nor budget ($${availableBudget}) can accommodate supplier MOQ (${supplier.moq}). Recommend splitting order to secondary supplier or escalating.`;
          suggestedCorrection = {
            action: 'SPLIT_TO_SECONDARY_SUPPLIER',
            recommendedQty: maxFeasibleQty,
          };
        } else {
          feedbackDiagnostic = `FEEDBACK LOOP ADJUSTMENT: Proposed quantity (${params.proposedQty}) violated constraints. Recommended adjustment: Cap order at ${maxFeasibleQty} units.`;
          suggestedCorrection = {
            action: 'REDUCE_QUANTITY',
            recommendedQty: maxFeasibleQty,
          };
        }
      } else if (moqFail) {
        feedbackDiagnostic = `FEEDBACK LOOP ADJUSTMENT: Proposed quantity (${params.proposedQty}) is below supplier MOQ. Bumping quantity to ${supplier.moq} units.`;
        suggestedCorrection = {
          action: 'INCREASE_TO_MOQ',
          recommendedQty: supplier.moq,
        };
      }
    } else if (warnChecks.some(c => c.rule.includes('Single-Buyer'))) {
      feedbackDiagnostic = `DELEGATION NOTICE: Order violates financial authorization cap ($${this.BUYER_DELEGATION_LIMIT}). Manager escalation triggered.`;
      suggestedCorrection = {
        action: 'REQUEST_HUMAN_APPROVAL',
      };
    } else {
      feedbackDiagnostic = 'VALIDATION SUCCESS: All hard operational constraints satisfied.';
    }

    return {
      isValid,
      score,
      checks,
      feedbackDiagnostic,
      suggestedCorrection,
    };
  }
}
