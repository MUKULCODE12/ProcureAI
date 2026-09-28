export interface SKU {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  unitVolumePallet: number; // Volume per unit in pallet ratio
  minOrderQty: number;
  safetyStockDays: number;
}

export interface FulfillmentNode {
  id: string;
  name: string;
  location: string;
  maxCapacityUnits: number;
  currentUnitsUsed: number;
  monthlyBudget: number;
  budgetUsed: number;
}

export interface Supplier {
  id: string;
  name: string;
  skuId: string;
  leadTimeDays: number;
  moq: number;
  unitPrice: number;
  reliabilityRating: number; // 0 - 1.0
  tier: 'PRIMARY' | 'SECONDARY';
}

export interface InventoryRecord {
  skuId: string;
  nodeId: string;
  onHandUnits: number;
  allocatedUnits: number;
  avgDailyDemand: number;
  forecast14Days: number;
  demandSurgeMultiplier: number; // 1.0 = normal, 2.5 = 150% surge
}

export interface PurchaseOrder {
  id: string;
  skuId: string;
  supplierId: string;
  nodeId: string;
  orderedQty: number;
  fulfilledQty: number;
  unitPrice: number;
  totalCost: number;
  status: 'OPEN' | 'PARTIALLY_FULFILLED' | 'FULFILLED' | 'CANCELLED' | 'PENDING_APPROVAL';
  createdAt: string;
  expectedDelivery: string;
  notes?: string;
}

export interface SystemRecommendation {
  id: string;
  skuId: string;
  nodeId: string;
  recommendedQty: number;
  triggerReason: string;
  createdTime: string;
}

export interface AuditLogStep {
  id: string;
  timestamp: string;
  stepType: 'THINKING' | 'TOOL_INVOCATION' | 'CONSTRAINT_CHECK' | 'ACTION_EXECUTION' | 'VALIDATION' | 'ESCALATION';
  title: string;
  detail: string;
  status: 'INFO' | 'PASS' | 'WARN' | 'FAIL';
  payload?: any;
}

export interface ScenarioDefinition {
  id: string;
  title: string;
  description: string;
  targetSkuId: string;
  targetNodeId: string;
  initialRecommendationQty: number;
  expectedOutcome: 'MODIFY' | 'SPLIT' | 'EXPEDITE' | 'ESCALATE';
}

// Initial Mock Database State
const INITIAL_SKUS: SKU[] = [
  {
    id: 'SKU-101',
    name: 'Fresh Whole Milk 1L',
    category: 'Dairy & Chillers',
    unitPrice: 2.50,
    unitVolumePallet: 1,
    minOrderQty: 200,
    safetyStockDays: 3,
  },
  {
    id: 'SKU-102',
    name: 'Hass Avocado 4-Pack',
    category: 'Fresh Produce',
    unitPrice: 4.80,
    unitVolumePallet: 1,
    minOrderQty: 100,
    safetyStockDays: 2,
  },
  {
    id: 'SKU-103',
    name: 'Red Bull Energy Drink 250ml (Pack of 6)',
    category: 'Beverages',
    unitPrice: 9.50,
    unitVolumePallet: 1,
    minOrderQty: 300,
    safetyStockDays: 4,
  },
  {
    id: 'SKU-104',
    name: 'Organic Brown Eggs 12s',
    category: 'Dairy & Eggs',
    unitPrice: 4.00,
    unitVolumePallet: 1,
    minOrderQty: 500,
    safetyStockDays: 3,
  },
];

const INITIAL_NODES: FulfillmentNode[] = [
  {
    id: 'NODE-DELHI-NORTH',
    name: 'Delhi North Dark Store',
    location: 'Rohini, New Delhi',
    maxCapacityUnits: 1200,
    currentUnitsUsed: 750, // 450 units available space
    monthlyBudget: 15000,
    budgetUsed: 13500, // $1,500 remaining budget
  },
  {
    id: 'NODE-BLR-SOUTH',
    name: 'Bengaluru HSR Dark Store',
    location: 'HSR Layout, Bengaluru',
    maxCapacityUnits: 2000,
    currentUnitsUsed: 1400, // 600 units space
    monthlyBudget: 25000,
    budgetUsed: 18000, // $7,000 remaining
  },
];

const INITIAL_SUPPLIERS: Supplier[] = [
  // SKU-101 (Fresh Milk)
  {
    id: 'SUP-DAIRY-FRESH',
    name: 'DairyFresh Co.',
    skuId: 'SKU-101',
    leadTimeDays: 2,
    moq: 200,
    unitPrice: 2.50,
    reliabilityRating: 0.96,
    tier: 'PRIMARY',
  },
  {
    id: 'SUP-FARM-DIRECT',
    name: 'FarmDirect Logistics',
    skuId: 'SKU-101',
    leadTimeDays: 3,
    moq: 100,
    unitPrice: 2.70,
    reliabilityRating: 0.92,
    tier: 'SECONDARY',
  },

  // SKU-103 (Energy Drink)
  {
    id: 'SUP-GLOBAL-BEV',
    name: 'GlobalBev Bottlers',
    skuId: 'SKU-103',
    leadTimeDays: 3,
    moq: 300,
    unitPrice: 9.50,
    reliabilityRating: 0.98,
    tier: 'PRIMARY',
  },
  {
    id: 'SUP-EXPRESS-BEV',
    name: 'ExpressBev Fast Track',
    skuId: 'SKU-103',
    leadTimeDays: 1, // Air express
    moq: 150,
    unitPrice: 10.50,
    reliabilityRating: 0.99,
    tier: 'SECONDARY',
  },

  // SKU-104 (Eggs)
  {
    id: 'SUP-EGG-FARMS',
    name: 'Golden Egg Farms',
    skuId: 'SKU-104',
    leadTimeDays: 3,
    moq: 800, // High MOQ!
    unitPrice: 4.00,
    reliabilityRating: 0.95,
    tier: 'PRIMARY',
  },
  {
    id: 'SUP-LOCAL-POULTRY',
    name: 'Metro Local Poultry',
    skuId: 'SKU-104',
    leadTimeDays: 2,
    moq: 300,
    unitPrice: 4.30,
    reliabilityRating: 0.90,
    tier: 'SECONDARY',
  }
];

const INITIAL_INVENTORY: InventoryRecord[] = [
  {
    skuId: 'SKU-101',
    nodeId: 'NODE-DELHI-NORTH',
    onHandUnits: 150,
    allocatedUnits: 20,
    avgDailyDemand: 60,
    forecast14Days: 840,
    demandSurgeMultiplier: 1.0,
  },
  {
    skuId: 'SKU-102',
    nodeId: 'NODE-DELHI-NORTH',
    onHandUnits: 80,
    allocatedUnits: 10,
    avgDailyDemand: 25,
    forecast14Days: 350,
    demandSurgeMultiplier: 1.0,
  },
  {
    skuId: 'SKU-103',
    nodeId: 'NODE-DELHI-NORTH',
    onHandUnits: 120,
    allocatedUnits: 30,
    avgDailyDemand: 40,
    forecast14Days: 560,
    demandSurgeMultiplier: 1.0,
  },
  {
    skuId: 'SKU-104',
    nodeId: 'NODE-DELHI-NORTH',
    onHandUnits: 200,
    allocatedUnits: 20,
    avgDailyDemand: 70,
    forecast14Days: 980,
    demandSurgeMultiplier: 1.0,
  },
];

const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'PO-2026-001',
    skuId: 'SKU-101',
    supplierId: 'SUP-DAIRY-FRESH',
    nodeId: 'NODE-DELHI-NORTH',
    orderedQty: 100,
    fulfilledQty: 100,
    unitPrice: 2.50,
    totalCost: 250.00,
    status: 'FULFILLED',
    createdAt: '2026-09-20',
    expectedDelivery: '2026-09-22',
  },
  {
    id: 'PO-2026-002',
    skuId: 'SKU-103',
    supplierId: 'SUP-GLOBAL-BEV',
    nodeId: 'NODE-DELHI-NORTH',
    orderedQty: 200,
    fulfilledQty: 0,
    unitPrice: 9.50,
    totalCost: 1900.00,
    status: 'OPEN',
    createdAt: '2026-09-26',
    expectedDelivery: '2026-09-29',
  }
];

export const SCENARIO_DEFINITIONS: ScenarioDefinition[] = [
  {
    id: 'SCENARIO-1',
    title: 'Scenario 1: Purchase Recommendation Review',
    description: 'System recommends buying 800 units of Fresh Milk. Agent checks inventory, forecast, budget ($1,500 limit) and storage capacity (450 available space), and modifies recommendation to 400 units.',
    targetSkuId: 'SKU-101',
    targetNodeId: 'NODE-DELHI-NORTH',
    initialRecommendationQty: 800,
    expectedOutcome: 'MODIFY',
  },
  {
    id: 'SCENARIO-2',
    title: 'Scenario 2: Supplier Cannot Fulfil Purchase',
    description: 'A PO of 500 units was created, but supplier notifies only 250 units can be fulfilled. Agent evaluates stockout risk, validates inventory buffer, and issues a split PO of 250 units to secondary supplier FarmDirect.',
    targetSkuId: 'SKU-101',
    targetNodeId: 'NODE-DELHI-NORTH',
    initialRecommendationQty: 500,
    expectedOutcome: 'SPLIT',
  },
  {
    id: 'SCENARIO-3',
    title: 'Scenario 3: Demand & Forecast Surge Anomaly',
    description: 'Actual sales for Red Bull spike +180% unexpectedly. Existing PO of 200 units will lead to stockout in 48h. Agent detects anomaly, calculates urgent deficit, and creates an express PO of 450 units with fast delivery.',
    targetSkuId: 'SKU-103',
    targetNodeId: 'NODE-DELHI-NORTH',
    initialRecommendationQty: 200,
    expectedOutcome: 'EXPEDITE',
  },
  {
    id: 'SCENARIO-4',
    title: 'Scenario 4: Multi-Constraint Escalation & Delegation',
    description: 'Recommended 1,000 units of Organic Eggs. Primary supplier MOQ is 800 ($3,200 total), which breaches buyer delegation limit ($2,500). Agent escalates for human sign-off with clear fallback options.',
    targetSkuId: 'SKU-104',
    targetNodeId: 'NODE-DELHI-NORTH',
    initialRecommendationQty: 1000,
    expectedOutcome: 'ESCALATE',
  }
];

// In-Memory Database Store Class
class MockDatabase {
  private skus: SKU[] = [];
  private nodes: FulfillmentNode[] = [];
  private suppliers: Supplier[] = [];
  private inventory: InventoryRecord[] = [];
  private purchaseOrders: PurchaseOrder[] = [];

  constructor() {
    this.reset();
  }

  public reset() {
    this.skus = JSON.parse(JSON.stringify(INITIAL_SKUS));
    this.nodes = JSON.parse(JSON.stringify(INITIAL_NODES));
    this.suppliers = JSON.parse(JSON.stringify(INITIAL_SUPPLIERS));
    this.inventory = JSON.parse(JSON.stringify(INITIAL_INVENTORY));
    this.purchaseOrders = JSON.parse(JSON.stringify(INITIAL_PURCHASE_ORDERS));
  }

  // Getters
  public getSKUs(): SKU[] {
    return this.skus;
  }

  public getSKU(id: string): SKU | undefined {
    return this.skus.find(s => s.id === id);
  }

  public getNodes(): FulfillmentNode[] {
    return this.nodes;
  }

  public getNode(id: string): FulfillmentNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  public getSuppliers(skuId?: string): Supplier[] {
    if (!skuId) return this.suppliers;
    return this.suppliers.filter(s => s.skuId === skuId);
  }

  public getInventory(skuId: string, nodeId: string): InventoryRecord | undefined {
    return this.inventory.find(i => i.skuId === skuId && i.nodeId === nodeId);
  }

  public getInventoryList(): InventoryRecord[] {
    return this.inventory;
  }

  public getPurchaseOrders(nodeId?: string): PurchaseOrder[] {
    if (!nodeId) return this.purchaseOrders;
    return this.purchaseOrders.filter(p => p.nodeId === nodeId);
  }

  // Mutations
  public updateInventoryDemandSurge(skuId: string, nodeId: string, multiplier: number) {
    const rec = this.getInventory(skuId, nodeId);
    if (rec) {
      rec.demandSurgeMultiplier = multiplier;
    }
  }

  public createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'createdAt'>): PurchaseOrder {
    const id = `PO-2026-${String(this.purchaseOrders.length + 1).padStart(3, '0')}`;
    const newPO: PurchaseOrder = {
      ...po,
      id,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.purchaseOrders.unshift(newPO);

    // Update Node budget and capacity usage if approved or open
    if (po.status === 'OPEN' || po.status === 'PARTIALLY_FULFILLED' || po.status === 'FULFILLED') {
      const node = this.getNode(po.nodeId);
      if (node) {
        node.budgetUsed += po.totalCost;
        node.currentUnitsUsed += po.orderedQty;
      }
    }

    return newPO;
  }

  public updatePOStatus(poId: string, status: PurchaseOrder['status'], fulfilledQty?: number) {
    const po = this.purchaseOrders.find(p => p.id === poId);
    if (po) {
      po.status = status;
      if (fulfilledQty !== undefined) {
        po.fulfilledQty = fulfilledQty;
      }
    }
  }

  public updateNodeBudgetAndStorage(nodeId: string, budgetDelta: number, unitsDelta: number) {
    const node = this.getNode(nodeId);
    if (node) {
      node.budgetUsed += budgetDelta;
      node.currentUnitsUsed += unitsDelta;
    }
  }
}

export const db = new MockDatabase();
