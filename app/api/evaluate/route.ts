import { NextResponse } from 'next/server';
import { AgentEvaluator } from '../../../lib/agent/evaluation';

export async function GET() {
  try {
    const benchmark = await AgentEvaluator.runBenchmarkSuite();
    return NextResponse.json(benchmark);
  } catch (error: any) {
    console.error('Benchmark execution error:', error);
    return NextResponse.json({ error: error.message || 'Benchmark execution failed' }, { status: 500 });
  }
}
