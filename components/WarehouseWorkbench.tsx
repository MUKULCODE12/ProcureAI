'use client';

import React, { useState } from 'react';
import { db, FulfillmentNode, SKU, InventoryRecord, PurchaseOrder } from '../lib/store/mock-db';
import { Building2, DollarSign, Layers, PackageCheck, AlertCircle, ShoppingBag } from 'lucide-react';

export const WarehouseWorkbench: React.FC = () => {
  const nodes = db.getNodes();
  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || 'NODE-DELHI-NORTH');

  const selectedNode = db.getNode(selectedNodeId)!;
  const inventoryList = db.getInventoryList().filter(i => i.nodeId === selectedNodeId);
  const purchaseOrders = db.getPurchaseOrders(selectedNodeId);

  const storageUsedPct = Math.round((selectedNode.currentUnitsUsed / selectedNode.maxCapacityUnits) * 100);
  const budgetUsedPct = Math.round((selectedNode.budgetUsed / selectedNode.monthlyBudget) * 100);

  return (
    <div className="space-y-6">
      {/* Node Switcher & High Level Gauges */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-base text-white">{selectedNode.name}</h2>
            <p className="text-xs text-slate-400">{selectedNode.location}</p>
          </div>
        </div>

        {/* Node selector buttons */}
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          {nodes.map(n => (
            <button
              key={n.id}
              onClick={() => setSelectedNodeId(n.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedNodeId === n.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {n.name.split(' ')[0]} {n.name.split(' ')[1]}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Storage Capacity Gauge */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">Physical Warehouse Storage</h3>
            </div>
            <span className="font-mono text-xs font-bold text-indigo-400">
              {selectedNode.currentUnitsUsed} / {selectedNode.maxCapacityUnits} units ({storageUsedPct}%)
            </span>
          </div>

          {/* Storage Bar */}
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                storageUsedPct > 85 ? 'bg-amber-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
              }`}
              style={{ width: `${Math.min(100, storageUsedPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
            <span>Occupied: {selectedNode.currentUnitsUsed} units</span>
            <span>Available Capacity: {selectedNode.maxCapacityUnits - selectedNode.currentUnitsUsed} units</span>
          </div>
        </div>

        {/* Purchasing Budget Gauge */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-sm text-white">Monthly Purchasing Budget</h3>
            </div>
            <span className="font-mono text-xs font-bold text-emerald-400">
              ${selectedNode.budgetUsed.toFixed(2)} / ${selectedNode.monthlyBudget.toFixed(2)} ({budgetUsedPct}%)
            </span>
          </div>

          {/* Budget Bar */}
          <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                budgetUsedPct > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'
              }`}
              style={{ width: `${Math.min(100, budgetUsedPct)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-400 font-mono pt-1">
            <span>Spent: ${selectedNode.budgetUsed.toFixed(2)}</span>
            <span>Remaining Budget: ${(selectedNode.monthlyBudget - selectedNode.budgetUsed).toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Inventory & Demand Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Active SKU Inventory & Demand State</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{inventoryList.length} SKUs tracked</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">SKU Code</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">On Hand</th>
                <th className="py-3 px-4">Avg Daily Demand</th>
                <th className="py-3 px-4">Surge Multiplier</th>
                <th className="py-3 px-4">14-Day Forecast</th>
                <th className="py-3 px-4">Unit Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {inventoryList.map(inv => {
                const sku = db.getSKU(inv.skuId);
                return (
                  <tr key={inv.skuId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-indigo-400">{inv.skuId}</td>
                    <td className="py-3 px-4 font-sans font-medium text-white">{sku?.name}</td>
                    <td className="py-3 px-4">{inv.onHandUnits} units</td>
                    <td className="py-3 px-4">{inv.avgDailyDemand} u/day</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inv.demandSurgeMultiplier > 1.5 ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {inv.demandSurgeMultiplier}x
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-white">{Math.round(inv.avgDailyDemand * inv.demandSurgeMultiplier * 14)} units</td>
                    <td className="py-3 px-4 text-emerald-400">${sku?.unitPrice.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Open Purchase Orders Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-purple-400" />
            <h3 className="font-bold text-sm text-white">Open Purchase Orders Registry</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">{purchaseOrders.length} orders total</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4">Ordered Qty</th>
                <th className="py-3 px-4">Fulfilled</th>
                <th className="py-3 px-4">Total Cost</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {purchaseOrders.map(po => {
                const supplier = db.getSuppliers().find(s => s.id === po.supplierId);
                return (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-white">{po.id}</td>
                    <td className="py-3 px-4 text-indigo-400">{po.skuId}</td>
                    <td className="py-3 px-4 font-sans text-slate-300">{supplier?.name || po.supplierId}</td>
                    <td className="py-3 px-4 font-bold">{po.orderedQty} units</td>
                    <td className="py-3 px-4 text-slate-400">{po.fulfilledQty} units</td>
                    <td className="py-3 px-4 text-emerald-400 font-bold">${po.totalCost.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        po.status === 'FULFILLED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        po.status === 'PARTIALLY_FULFILLED' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
