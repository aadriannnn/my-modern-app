import json
import os
import logging
import uuid
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class PlanManager:
    """Manages reading/writing analysis plans to disk."""

    def __init__(self, plans_dir: str = "analyzer_plans"):
        self.plans_dir = plans_dir
        os.makedirs(self.plans_dir, exist_ok=True)

    def create_plan_object(self, user_query: str, strategy: Dict[str, Any], total_cases: int, all_ids: List[int], chunk_size: int = 50) -> Dict[str, Any]:
        """Creates the plan dictionary structure."""
        chunks = [all_ids[i:i + chunk_size] for i in range(0, len(all_ids), chunk_size)]
        plan_id = str(uuid.uuid4())

        plan = {
            "plan_id": plan_id,
            "user_query": user_query,
            "strategy": strategy,
            "total_cases": total_cases,
            "total_chunks": len(chunks),
            "chunk_size": chunk_size,
            "chunks": chunks,
            "created_at": 0, # Should be time.time(), caller can set or we import time
            "status": "created",
            "strategies_used": strategy.get("strategies_used", [strategy.get("strategy_type")]),
            "strategy_breakdown": strategy.get("strategy_breakdown", {})
        }
        return plan

    def save_plan(self, plan: Dict[str, Any]):
        """Saves the plan to disk."""
        import time
        if plan.get("created_at") == 0:
            plan["created_at"] = time.time()

        file_path = os.path.join(self.plans_dir, f"{plan['plan_id']}.json")
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(plan, f, indent=2, ensure_ascii=False)

    def load_plan(self, plan_id: str) -> Dict[str, Any]:
        plan_path = os.path.join(self.plans_dir, f"{plan_id}.json")
        if not os.path.exists(plan_path):
            raise FileNotFoundError(f"Planul {plan_id} nu există.")

        with open(plan_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def save_chunk_result(self, plan_id: str, chunk_index: int, result: Dict[str, Any]):
        result_file = os.path.join(self.plans_dir, f"{plan_id}_chunk_{chunk_index}.json")
        with open(result_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)

    def load_chunk_result(self, plan_id: str, chunk_index: int) -> Dict[str, Any]:
        chunk_file = os.path.join(self.plans_dir, f"{plan_id}_chunk_{chunk_index}.json")
        if os.path.exists(chunk_file):
            with open(chunk_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def update_plan_case_limit(self, plan_id: str, max_cases: int) -> Dict[str, Any]:
        """Updates plan with new case limit."""
        try:
            plan = self.load_plan(plan_id)
            original_total = plan.get('total_cases', 0)

            if max_cases < 1: max_cases = 1
            if max_cases > original_total: max_cases = original_total

            all_ids = []
            for chunk in plan.get('chunks', []):
                all_ids.extend(chunk)

            limited_ids = all_ids[:max_cases]
            chunk_size = plan.get('chunk_size', 50)
            new_chunks = [limited_ids[i:i + chunk_size] for i in range(0, len(limited_ids), chunk_size)]

            plan['total_cases'] = len(limited_ids)
            plan['total_chunks'] = len(new_chunks)
            plan['chunks'] = new_chunks
            plan['original_total_cases'] = original_total

            self.save_plan(plan)

            estimated_seconds = (len(new_chunks) + 1) * 60
            return {
                'success': True,
                'plan_id': plan_id,
                'total_cases': len(limited_ids),
                'original_total_cases': original_total,
                'total_chunks': len(new_chunks),
                'estimated_time_seconds': estimated_seconds,
                'estimated_time_minutes': round(estimated_seconds / 60, 1)
            }
        except Exception as e:
            logger.error(f"Error updating plan limit: {e}")
            return {'success': False, 'error': str(e)}
