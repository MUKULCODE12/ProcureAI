'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { ScenarioRunner } from '../components/ScenarioRunner';
import { WarehouseWorkbench } from '../components/WarehouseWorkbench';
import { EvaluationDashboard } from '../components/EvaluationDashboard';
import { AgentExecutionResult } from '../lib/agent/engine';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'scenarios' | 'workbench' | 'evaluation'>('scenarios');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [latestResult, setLatestResult] = useState<AgentExecutionResult | null>(null);

  const handleRunScenario = async (scenarioId: string, surgeMultiplier: number): Promise<AgentExecutionResult | null> => {
    setIsRunning(true);
    try {
      const res = await fetch('/api/scenario/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenarioId, surgeMultiplier }),
      });
      const data: AgentExecutionResult = await res.json();
      setLatestResult(data);
      return data;
    } catch (err) {
      console.error('Failed to execute scenario:', err);
      return null;
    } finally {
      setIsRunning(false);
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/scenario/reset', { method: 'POST' });
      setLatestResult(null);
      // Auto run default Scenario 1 to show fresh state
      await handleRunScenario('SCENARIO-1', 1.0);
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // Run initial scenario on load for immediate interactive demonstration
  useEffect(() => {
    handleRunScenario('SCENARIO-1', 1.0);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onResetData={handleResetData}
        isResetting={isResetting}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {activeTab === 'scenarios' && (
          <ScenarioRunner
            onRunScenario={handleRunScenario}
            isRunning={isRunning}
            latestResult={latestResult}
          />
        )}

        {activeTab === 'workbench' && <WarehouseWorkbench />}

        {activeTab === 'evaluation' && <EvaluationDashboard />}
      </main>

      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 font-mono">
        ProcureAI — Autonomous Quick-Commerce Purchasing Agent & Evaluation Suite
      </footer>
    </div>
  );
}
