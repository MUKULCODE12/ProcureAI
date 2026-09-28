import { db, SKU, FulfillmentNode, Supplier, InventoryRecord, PurchaseOrder } from '../store/mock-db';

export interface ProcurementNeed {
  sku: SKU;
  node: FulfillmentNode;
  inventory: InventoryRecord;
  openPOIncomingQty: number;
  effectiveDailyDemand: number;
  leadTimeDays: number;
  targetStockDays: number;
  requiredStockUnits: number;
  netProcurementNeedUnits: number;
  availableStorageUnits: number;
  availableBudget: number;
}

export class AgentTools {
  /**
   * Tool: Fetch Inventory & Forecast state for a specific SKU & Node
   */
  public static getInventoryAndForecast(skuId: string, nodeId: string) {
    const sku = db.getSKU(skuId);
    const node = db.getNode(nodeId);
    const inventory = db.getInventory(skuId, nodeId);

    if (!sku || !node || !inventory) {
      throw new Error(`Data missing for SKU ${skuId} at Node ${nodeId}`);
    }

    const openPOs = db.getPurchaseOrders(nodeId).filter(
      p => p.skuId === skuId && (p.status === 'OPEN' || p.status === 'PARTIALLY_FULFILLED')
    );

    const openPOIncomingQty = openPOs.reduce((acc, p) => acc + (p.orderedQty - p.fulfilledQty), 0);
    const effectiveDailyDemand = inventory.avgDailyDemand * inventory.demandSurgeMultiplier;

    return {
      sku,
      node,
      inventory,
      openPOs,
      openPOIncomingQty,
      effectiveDailyDemand,
    };
  }

  /**
   * Tool: Get Suppliers sorted by primary/secondary tier
   */
  public static getSuppliers(skuId: string): Supplier[] {
    return db.getSuppliers(skuId);
  }

  /**
   * Tool: Get Warehouse & Financial Constraints
   */
  public static getConstraints(nodeId: string) {
    const node = db.getNode(nodeId);
    if (!node) throw new Error(`Node ${nodeId} not found`);

    const availableStorageUnits = Math.max(0, node.maxCapacityUnits - node.currentUnitsUsed);
    const availableBudget = Math.max(0, node.monthlyBudget - node.budgetUsed);

    return {
      nodeId: node.id,
      nodeName: node.name,
      maxCapacityUnits: node.maxCapacityUnits,
      currentUnitsUsed: node.currentUnitsUsed,
      availableStorageUnits,
      monthlyBudget: node.monthlyBudget,
      budgetUsed: node.budgetUsed,
      availableBudget,
    };
  }

  /**
   * Tool: Calculate mathematically optimal procurement requirement
   */
  public static calculateNetProcurementNeed(skuId: string, nodeId: string): ProcurementNeed {
    const state = this.getInventoryAndForecast(skuId, nodeId);
    const constraints = this.getConstraints(nodeId);
    const primarySupplier = db.getSuppliers(skuId).find(s => s.tier === 'PRIMARY') || db.getSuppliers(skuId)[0];

    const leadTimeDays = primarySupplier ? primarySupplier.leadTimeDays : 3;
    const targetStockDays = leadTimeDays + state.sku.safetyStockDays + 7; // 7 day coverage target

    const requiredStockUnits = Math.ceil(state.effectiveDailyDemand * targetStockDays);
    const currentOnPipeline = state.inventory.onHandUnits + state.openPOIncomingQty;
    const rawNeed = requiredStockUnits - currentOnPipeline;
    const netProcurementNeedUnits = Math.max(0, rawNeed);

    return {
      sku: state.sku,
      node: state.node,
      inventory: state.inventory,
      openPOIncomingQty: state.openPOIncomingQty,
      effectiveDailyDemand: state.effectiveDailyDemand,
      leadTimeDays,
      targetStockDays,
      requiredStockUnits,
      netProcurementNeedUnits,
      availableStorageUnits: constraints.availableStorageUnits,
      availableBudget: constraints.availableBudget,
    };
  }

  /**
   * Tool: Execute Purchase Order
   */
  public static executePO(params: {
    skuId: string;
    supplierId: string;
    nodeId: string;
    qty: number;
    notes?: string;
  }) {
    const supplier = db.getSuppliers().find(s => s.id === params.supplierId);
    if (!supplier) throw new Error(`Supplier ${params.supplierId} not found`);

    const totalCost = params.qty * supplier.unitPrice;

    const newPO = db.createPurchaseOrder({
      skuId: params.skuId,
      supplierId: params.supplierId,
      nodeId: params.nodeId,
      orderedQty: params.qty,
      fulfilledQty: params.qty, // Assuming standard fulfillment unless partial scenario
      unitPrice: supplier.unitPrice,
      totalCost,
      status: 'OPEN',
      expectedDelivery: new Date(Date.now() + supplier.leadTimeDays * 86400000).toISOString().split('T')[0],
      notes: params.notes,
    });

    return newPO;
  }
}
