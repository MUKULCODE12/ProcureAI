'use client';

import React, { useState, useEffect } from 'react';
import { EvaluationBenchmarkSummary } from '../lib/agent/evaluation';
import {
  Bot,
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Zap,
  Clock,
  Layers,
  Sparkles,
  BarChart3,
  Cpu
} from 'lucide-react';

export const EvaluationDashboard: React.FC = () => {
  const [benchmark, setBenchmark] = useState<EvaluationBenchmarkSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBenchmark = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/evaluate');
      const data = await res.json();
      setBenchmark(data);
    } catch (err) {
      console.error('Failed to run benchmark:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBenchmark();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner & Trigger */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bot className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-base text-white">Agent Evaluation & Benchmark Suite</h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Quantitative assessment verifying whether agent decisions obtain complete context, adhere to operational constraints, validate results, and recover from failures.
          </p>
        </div>

        <button
          onClick={fetchBenchmark}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50"
        >
          {loading ? (
            <>
              <Cpu className="w-4 h-4 animate-spin" />
              <span>Running Suite...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Run Automated Benchmark</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Scorecards */}
      {benchmark && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Overall Accuracy</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-3xl font-extrabold font-mono text-emerald-400">
                {benchmark.overallAccuracyScore}%
              </div>
              <p className="text-[11px] text-slate-500 font-mono">
                {benchmark.passedScenarios} of {benchmark.totalScenarios} scenarios passed 100%
              </p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Constraint Adherence</span>
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-3xl font-extrabold font-mono text-indigo-400">
                {benchmark.constraintAdherenceRate}%
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Storage, Budget & MOQ rules respected</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Feedback Recovery Rate</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-3xl font-extrabold font-mono text-amber-400">
                {benchmark.feedbackRecoveryRate}%
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Self-correction loop success rate</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Avg Decision Latency</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-3xl font-extrabold font-mono text-purple-400">
                {benchmark.avgLatencyMs} ms
              </div>
              <p className="text-[11px] text-slate-500 font-mono">Sub-second execution speed</p>
            </div>
          </div>

          {/* Detailed Scenario Compliance Cards */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-300">Detailed Scenario Evaluation Reports</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {benchmark.reports.map(rep => (
                <div key={rep.scenarioId} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                        {rep.scenarioId}
                      </span>
                      <h4 className="font-bold text-sm text-white mt-1">{rep.scenarioTitle}</h4>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${
                        rep.passed ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {rep.passed ? 'PASS' : 'FAIL'} ({rep.score}%)
                      </span>
                      <span className="block text-[10px] font-mono text-slate-500 mt-1">{rep.latencyMs} ms</span>
                    </div>
                  </div>

                  {/* Dimension Checklist */}
                  <div className="space-y-2 text-xs">
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                      {rep.dimensions.informationGathered.pass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-200">Information Gathering</span>
                        <p className="text-[11px] text-slate-400">{rep.dimensions.informationGathered.note}</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                      {rep.dimensions.constraintRespect.pass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-200">Constraint Verification</span>
                        <p className="text-[11px] text-slate-400">{rep.dimensions.constraintRespect.note}</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                      {rep.dimensions.actionCorrectness.pass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-200">Action & Strategy Alignment</span>
                        <p className="text-[11px] text-slate-400">{rep.dimensions.actionCorrectness.note}</p>
                      </div>
                    </div>

                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 flex items-start gap-2">
                      {rep.dimensions.selfCorrectionRecovery.pass ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-semibold text-slate-200">Feedback Loop & Recovery</span>
                        <p className="text-[11px] text-slate-400">{rep.dimensions.selfCorrectionRecovery.note}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
