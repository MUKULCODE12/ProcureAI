'use client';

import React, { useState } from 'react';
import { SCENARIO_DEFINITIONS, ScenarioDefinition } from '../lib/store/mock-db';
import { AgentExecutionResult } from '../lib/agent/engine';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Sliders,
  ShieldCheck,
  UserCheck,
  Cpu,
  Layers,
  ArrowRight,
  Sparkles,
  Info,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface ScenarioRunnerProps {
  onRunScenario: (scenarioId: string, surgeMultiplier: number) => Promise<AgentExecutionResult | null>;
  isRunning: boolean;
  latestResult: AgentExecutionResult | null;
}

export const ScenarioRunner: React.FC<ScenarioRunnerProps> = ({
  onRunScenario,
  isRunning,
  latestResult,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>('SCENARIO-1');
  const [surgeMultiplier, setSurgeMultiplier] = useState<number>(2.5); // 150% surge
  const [approvalModalOpen, setApprovalModalOpen] = useState<boolean>(false);
  const [approvalDecision, setApprovalDecision] = useState<'APPROVED' | 'REJECTED' | null>(null);

  const activeScenario = SCENARIO_DEFINITIONS.find(s => s.id === selectedScenarioId)!;

  const handleRun = async () => {
    setApprovalDecision(null);
    const res = await onRunScenario(selectedScenarioId, surgeMultiplier);
    if (res?.requiresHumanApproval) {
      setApprovalModalOpen(true);
    }
  };

  const handleApprovePO = () => {
    setApprovalDecision('APPROVED');
    setApprovalModalOpen(false);
  };

  const handleRejectPO = () => {
    setApprovalDecision('REJECTED');
    setApprovalModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Scenario Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SCENARIO_DEFINITIONS.map(sc => {
          const isSelected = sc.id === selectedScenarioId;
          return (
            <div
              key={sc.id}
              onClick={() => setSelectedScenarioId(sc.id)}
              className={`cursor-pointer rounded-xl p-4 border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    {sc.id}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    Expected: {sc.expectedOutcome}
                  </span>
                </div>
                <h3 className="font-semibold text-sm text-white line-clamp-1 mb-1">{sc.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">{sc.description}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Target SKU: {sc.targetSkuId}</span>
                <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400 animate-ping' : 'bg-slate-700'}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Control Action Panel */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-2xl">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">{activeScenario.title}</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{activeScenario.description}</p>
          </div>

          {/* Scenario-specific controls */}
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            {selectedScenarioId === 'SCENARIO-3' && (
              <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="text-slate-300">Sales Surge:</span>
                <input
                  type="range"
                  min="1.2"
                  max="4.0"
                  step="0.1"
                  value={surgeMultiplier}
                  onChange={e => setSurgeMultiplier(parseFloat(e.target.value))}
                  className="w-24 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                  +{( (surgeMultiplier - 1) * 100 ).toFixed(0)}%
                </span>
              </div>
            )}

            <button
              onClick={handleRun}
              disabled={isRunning}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all duration-200 disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Cpu className="w-4 h-4 animate-spin" />
                  <span>Agent Investigating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Execute Agent Reasoning</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Result Grid: Audit Trail vs Decision Summary */}
      {latestResult && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Audit Trail Timeline (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Agent Execution Audit Trail</h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {latestResult.auditTrail.length} steps executed
              </span>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
              {latestResult.auditTrail.map((step, idx) => {
                let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                if (step.stepType === 'TOOL_INVOCATION') badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                if (step.stepType === 'CONSTRAINT_CHECK') badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                if (step.stepType === 'ACTION_EXECUTION') badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                if (step.stepType === 'VALIDATION') badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                if (step.stepType === 'ESCALATION') badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';

                return (
                  <div key={step.id} className="relative pl-6 pb-4 border-l-2 border-slate-800 last:border-0 last:pb-0">
                    <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                    </div>

                    <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${badgeColor}`}>
                          {step.stepType}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">{step.timestamp}</span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-200">{step.title}</h4>
                      <p className="text-xs text-slate-400 leading-relaxed font-sans">{step.detail}</p>

                      {step.payload && (
                        <div className="mt-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800/80 text-[11px] font-mono text-slate-300 overflow-x-auto">
                          <pre>{JSON.stringify(step.payload, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Decision Card & Feedback Validation (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Decision Overview */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <span className="text-xs text-slate-400">Agent Final Decision</span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    latestResult.decision === 'ACCEPTED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : latestResult.decision === 'MODIFIED'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : latestResult.decision === 'SPLIT'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : latestResult.decision === 'EXPEDITED'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {latestResult.decision}
                </span>
              </div>

              <h3 className="font-bold text-base text-white">{latestResult.title}</h3>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80">
                {latestResult.summaryReasoning}
              </p>

              {/* Quantity Comparison */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-center">
                  <span className="text-[11px] text-slate-400 block mb-1">System Recommended</span>
                  <span className="text-lg font-bold font-mono text-slate-400">
                    {latestResult.recommendedQty} units
                  </span>
                </div>
                <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/30 text-center">
                  <span className="text-[11px] text-indigo-300 block mb-1">Agent Final Executed</span>
                  <span className="text-lg font-bold font-mono text-indigo-400">
                    {latestResult.finalQty} units
                  </span>
                </div>
              </div>

              {/* Created Purchase Orders */}
              {latestResult.generatedPOs.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-semibold text-slate-300 block">Issued Purchase Orders</span>
                  {latestResult.generatedPOs.map(po => (
                    <div key={po.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-mono font-bold text-white block">{po.id}</span>
                        <span className="text-slate-400 text-[11px]">Qty: {po.orderedQty} units @ ${po.unitPrice}/u</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-emerald-400 block">${po.totalCost.toFixed(2)}</span>
                        <span className="text-[10px] text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono">
                          {po.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Human Approval Status if applicable */}
              {latestResult.requiresHumanApproval && (
                <div className="bg-rose-950/40 border border-rose-500/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold text-rose-300">Human Approval Required</span>
                    </div>
                    {approvalDecision && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        approvalDecision === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                      }`}>
                        {approvalDecision}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-rose-200/80 leading-relaxed">
                    {latestResult.approvalPayload?.reasoning}
                  </p>
                  {!approvalDecision && (
                    <button
                      onClick={() => setApprovalModalOpen(true)}
                      className="w-full py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20"
                    >
                      <UserCheck className="w-4 h-4" />
                      Open Buyer Sign-off Modal
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Feedback Loop Validation Engine Report */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-sm text-white">Feedback Validation Loop</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Score:</span>
                  <span className="font-mono font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
                    {latestResult.validationResult.score}/100
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {latestResult.validationResult.checks.map((chk, i) => (
                  <div key={i} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2 text-xs">
                    {chk.status === 'PASS' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                    {chk.status === 'WARN' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                    {chk.status === 'FAIL' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-200">{chk.rule}</span>
                        <span className={`text-[10px] font-mono font-bold ${
                          chk.status === 'PASS' ? 'text-emerald-400' : chk.status === 'WARN' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {chk.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">{chk.message}</p>
                    </div>
                  </div>
                ))}
              </div>

              {latestResult.validationResult.feedbackDiagnostic && (
                <div className="bg-indigo-950/40 border border-indigo-500/30 p-3 rounded-xl text-xs text-indigo-200 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-indigo-300 block mb-0.5">Feedback Diagnostics</span>
                    <p className="text-slate-300 text-[11px]">{latestResult.validationResult.feedbackDiagnostic}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Human Approval Escalation Modal */}
      {approvalModalOpen && latestResult?.approvalPayload && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Buyer Authorization Request</h3>
                <p className="text-xs text-slate-400">Financial Delegation Limit Triggered</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Proposed Purchase Cost:</span>
                <span className="font-mono font-bold text-rose-400">${latestResult.approvalPayload.poCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Buyer Delegation Threshold:</span>
                <span className="font-mono font-bold text-slate-300">${latestResult.approvalPayload.threshold.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Proposed Quantity:</span>
                <span className="font-mono font-bold text-white">{latestResult.approvalPayload.proposedQty} units</span>
              </div>

              <p className="text-slate-300 pt-2 leading-relaxed italic text-[11px]">
                "{latestResult.approvalPayload.reasoning}"
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRejectPO}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors border border-slate-700"
              >
                Reject & Split PO
              </button>
              <button
                onClick={handleApprovePO}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-500/20 transition-all"
              >
                Authorize Exception PO ($4,000)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
