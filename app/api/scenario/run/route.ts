import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '../../../../lib/agent/engine';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { scenarioId, surgeMultiplier } = body;

    if (!scenarioId) {
      return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    const result = await AgentEngine.executeScenario(scenarioId, surgeMultiplier || 1.0);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Scenario execution error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
