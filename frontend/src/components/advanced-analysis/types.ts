import type { QueueTask } from '../../types';

export type WorkflowStep = 'input' | 'queue_management' | 'creating_plan' | 'preview' | 'preview_batch' | 'executing' | 'executing_queue' | 'queue_results';

export interface PlanData {
    plan_id: string;
    total_cases: number;
    total_chunks: number;
    estimated_time_seconds: number;
    preview_data: any[];
    strategy_summary: string;
    original_total_cases?: number;
    strategies_used?: string[];
    strategy_breakdown?: Record<string, number>;
}

export interface QueueStatusData {
    position: number;
    total: number;
    status: 'queued' | 'processing' | 'completed' | 'error';
}

export interface AdvancedAnalysisState {
    query: string;
    currentStep: WorkflowStep;
    planData: PlanData | null;
    jobId: string | null;
    isLoading: boolean;
    result: any | null;
    error: string | null;
    queueTasks: QueueTask[];
    isQueueMode: boolean;
    selectedTaskId: string | null;
    notificationEmail: string;
    termsAccepted: boolean;
    executionMode: 'review' | 'direct';
    queueStatus: QueueStatusData;
}
