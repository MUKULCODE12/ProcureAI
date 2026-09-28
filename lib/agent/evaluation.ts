import { SCENARIO_DEFINITIONS } from '../store/mock-db';
import { AgentEngine, AgentExecutionResult } from './engine';

export interface ScenarioEvalReport {
  scenarioId: string;
  scenarioTitle: string;
  passed: boolean;
  score: number; // 0-100%
  decision: string;
  expectedOutcome: string;
  dimensions: {
    informationGathered: { pass: boolean; note: string };
    constraintRespect: { pass: boolean; note: string };
    actionCorrectness: { pass: boolean; note: string };
    resultValidation: { pass: boolean; note: string };
    selfCorrectionRecovery: { pass: boolean; note: string };
  };
  latencyMs: number;
  result: AgentExecutionResult;
}

export interface EvaluationBenchmarkSummary {
  timestamp: string;
  totalScenarios: number;
  passedScenarios: number;
  overallAccuracyScore: number;
  constraintAdherenceRate: number;
  feedbackRecoveryRate: number;
  avgLatencyMs: number;
  reports: ScenarioEvalReport[];
}

export class AgentEvaluator {
  /**
   * Run complete evaluation benchmark suite across all scenarios
   */
  public static async runBenchmarkSuite(): Promise<EvaluationBenchmarkSummary> {
    const reports: ScenarioEvalReport[] = [];
    let totalLatency = 0;

    for (const scenarioDef of SCENARIO_DEFINITIONS) {
      const startTime = Date.now();
      const result = await AgentEngine.executeScenario(scenarioDef.id);
      const latency = Date.now() - startTime;
      totalLatency += latency;

      const report = this.evaluateSingleResult(scenarioDef.id, scenarioDef.title, scenarioDef.expectedOutcome, result, latency);
      reports.push(report);
    }

    const passedCount = reports.filter(r => r.passed).length;
    const overallAccuracyScore = Math.round((passedCount / reports.length) * 100);
    const constraintAdherenceRate = Math.round(
      (reports.filter(r => r.dimensions.constraintRespect.pass).length / reports.length) * 100
    );
    const feedbackRecoveryRate = Math.round(
      (reports.filter(r => r.dimensions.selfCorrectionRecovery.pass).length / reports.length) * 100
    );

    return {
      timestamp: new Date().toLocaleString(),
      totalScenarios: reports.length,
      passedScenarios: passedCount,
      overallAccuracyScore,
      constraintAdherenceRate,
      feedbackRecoveryRate,
      avgLatencyMs: Math.round(totalLatency / reports.length),
      reports,
    };
  }

  private static evaluateSingleResult(
    scenarioId: string,
    title: string,
    expectedOutcome: string,
    result: AgentExecutionResult,
    latencyMs: number
  ): ScenarioEvalReport {
    // 1. Info Gathered check
    const toolCallSteps = result.auditTrail.filter(s => s.stepType === 'TOOL_INVOCATION');
    const infoGatheredPass = toolCallSteps.length >= 2;
    const infoGatheredNote = infoGatheredPass
      ? `Successfully executed ${toolCallSteps.length} tool calls to gather inventory, supplier, and constraint state.`
      : `Insufficient tool calls (${toolCallSteps.length}).`;

    // 2. Constraint Respect check
    const constraintPass = result.validationResult.score >= 80 || result.decision === 'ESCALATED';
    const constraintNote = constraintPass
      ? `All hard operational constraints respected (Score ${result.validationResult.score}/100).`
      : `Constraint violation detected in final decision state.`;

    // 3. Action Correctness check
    let actionPass = false;
    if (scenarioId === 'SCENARIO-1' && result.decision === 'MODIFIED') actionPass = true;
    if (scenarioId === 'SCENARIO-2' && result.decision === 'SPLIT') actionPass = true;
    if (scenarioId === 'SCENARIO-3' && result.decision === 'EXPEDITED') actionPass = true;
    if (scenarioId === 'SCENARIO-4' && result.decision === 'ESCALATED') actionPass = true;

    const actionNote = actionPass
      ? `Decision '${result.decision}' matches expected operational strategy '${expectedOutcome}'.`
      : `Decision '${result.decision}' deviated from expected outcome '${expectedOutcome}'.`;

    // 4. Result Validation check
    const validationPass = result.validationResult !== undefined && result.validationResult.checks.length >= 3;
    const validationNote = validationPass
      ? `Feedback validator completed ${result.validationResult.checks.length} constraint checks.`
      : `Validation checks missing.`;

    // 5. Self Correction Recovery check
    const selfCorrectionPass = result.auditTrail.some(
      s => s.title.includes('Self-Correction') || s.title.includes('Diagnostic') || s.title.includes('Escalation')
    );
    const selfCorrectionNote = selfCorrectionPass
      ? `Feedback loop successfully identified constraint boundary and executed recovery/escalation strategy.`
      : `No feedback recovery logged.`;

    const allPassed = infoGatheredPass && constraintPass && actionPass && validationPass && selfCorrectionPass;
    const score = Math.round(
      ((Number(infoGatheredPass) + Number(constraintPass) + Number(actionPass) + Number(validationPass) + Number(selfCorrectionPass)) / 5) * 100
    );

    return {
      scenarioId,
      scenarioTitle: title,
      passed: allPassed,
      score,
      decision: result.decision,
      expectedOutcome,
      dimensions: {
        informationGathered: { pass: infoGatheredPass, note: infoGatheredNote },
        constraintRespect: { pass: constraintPass, note: constraintNote },
        actionCorrectness: { pass: actionPass, note: actionNote },
        resultValidation: { pass: validationPass, note: validationNote },
        selfCorrectionRecovery: { pass: selfCorrectionPass, note: selfCorrectionNote },
      },
      latencyMs,
      result,
    };
  }
}
