# Prompt Performance Monitoring and Optimization
# Track prompt effectiveness and optimize based on response quality

import json
import time
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime
import logging

logger = logging.getLogger("PromptOptimization")

@dataclass
class PromptMetrics:
    """Metrics for tracking prompt performance."""
    prompt_type: str
    query_type: str
    response_length: int
    processing_time: float
    source_docs_used: int
    user_query_length: int
    context_length: int
    timestamp: str
    session_id: str
    model_used: str
    
    # Quality indicators
    has_code_examples: bool = False
    has_step_by_step: bool = False
    has_proper_formatting: bool = False
    has_source_citations: bool = False
    
    # Performance scores (0-1)
    completeness_score: float = 0.0
    clarity_score: float = 0.0
    actionability_score: float = 0.0

class PromptPerformanceTracker:
    """Track and analyze prompt performance across different scenarios."""
    
    def __init__(self):
        self.metrics_history: List[PromptMetrics] = []
        self.performance_cache = {}
        
    def analyze_response_quality(self, response: str, query: str, sources: List[Dict]) -> Dict[str, Any]:
        """Analyze the quality of a generated response."""
        analysis = {
            "has_code_examples": self._has_code_blocks(response),
            "has_step_by_step": self._has_numbered_steps(response),
            "has_proper_formatting": self._has_proper_formatting(response),
            "has_source_citations": len(sources) > 0,
            "completeness_score": self._calculate_completeness(response, query),
            "clarity_score": self._calculate_clarity(response),
            "actionability_score": self._calculate_actionability(response)
        }
        
        return analysis
    
    def _has_code_blocks(self, text: str) -> bool:
        """Check if response contains properly formatted code blocks."""
        return "```" in text and text.count("```") >= 2
    
    def _has_numbered_steps(self, text: str) -> bool:
        """Check if response contains numbered step-by-step instructions."""
        import re
        pattern = r'\d+\.\s+[A-Z]'
        return len(re.findall(pattern, text)) >= 2
    
    def _has_proper_formatting(self, text: str) -> bool:
        """Check if response uses proper markdown formatting."""
        formatting_indicators = ["**", "##", "###", "- ", "• ", "1. ", "2. "]
        return sum(1 for indicator in formatting_indicators if indicator in text) >= 3
    
    def _calculate_completeness(self, response: str, query: str) -> float:
        """Calculate how complete the response is (0-1 scale)."""
        # Simple heuristic based on response length relative to query complexity
        query_words = len(query.split())
        response_words = len(response.split())
        
        if query_words == 0:
            return 0.0
        
        # Expect roughly 10-20 words of response per word of query for technical content
        expected_ratio = max(10, min(20, query_words))
        actual_ratio = response_words / query_words
        
        # Score based on how close to expected ratio
        if actual_ratio >= expected_ratio:
            return min(1.0, actual_ratio / (expected_ratio * 1.5))
        else:
            return actual_ratio / expected_ratio
    
    def _calculate_clarity(self, response: str) -> float:
        """Calculate clarity score based on structure and readability."""
        score = 0.0
        
        # Check for clear structure
        if "##" in response or "###" in response:
            score += 0.3
        
        # Check for proper list formatting
        if "- " in response or "• " in response:
            score += 0.2
        
        # Check for code formatting
        if "```" in response:
            score += 0.2
        
        # Check for reasonable sentence length
        sentences = response.split('. ')
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences) if sentences else 0
        if 10 <= avg_sentence_length <= 25:  # Optimal range for technical content
            score += 0.3
        
        return min(1.0, score)
    
    def _calculate_actionability(self, response: str) -> float:
        """Calculate how actionable the response is."""
        score = 0.0
        
        # Check for specific commands
        command_indicators = ["oc ", "kubectl ", "systemctl ", "dnf ", "yum "]
        if any(cmd in response for cmd in command_indicators):
            score += 0.4
        
        # Check for step-by-step instructions
        if self._has_numbered_steps(response):
            score += 0.3
        
        # Check for configuration examples
        if any(format_type in response for format_type in ["yaml", "json", ".conf", ".cfg"]):
            score += 0.2
        
        # Check for verification steps
        verification_words = ["verify", "check", "validate", "confirm", "test"]
        if any(word in response.lower() for word in verification_words):
            score += 0.1
        
        return min(1.0, score)
    
    def record_prompt_performance(self, 
                                prompt_type: str,
                                query_type: str, 
                                query: str,
                                response: str,
                                sources: List[Dict],
                                processing_time: float,
                                context_length: int,
                                session_id: str,
                                model_used: str) -> None:
        """Record performance metrics for a prompt execution."""
        
        quality_analysis = self.analyze_response_quality(response, query, sources)
        
        metrics = PromptMetrics(
            prompt_type=prompt_type,
            query_type=query_type,
            response_length=len(response),
            processing_time=processing_time,
            source_docs_used=len(sources),
            user_query_length=len(query),
            context_length=context_length,
            timestamp=datetime.now().isoformat(),
            session_id=session_id,
            model_used=model_used,
            **quality_analysis
        )
        
        self.metrics_history.append(metrics)
        
        # Log performance summary
        logger.info({
            "message": "Prompt performance recorded",
            "prompt_type": prompt_type,
            "query_type": query_type,
            "completeness_score": quality_analysis["completeness_score"],
            "clarity_score": quality_analysis["clarity_score"],
            "actionability_score": quality_analysis["actionability_score"],
            "processing_time": processing_time
        })
    
    def get_performance_summary(self, last_n: int = 100) -> Dict[str, Any]:
        """Get performance summary for recent prompts."""
        recent_metrics = self.metrics_history[-last_n:] if self.metrics_history else []
        
        if not recent_metrics:
            return {"message": "No metrics available"}
        
        # Calculate averages
        avg_completeness = sum(m.completeness_score for m in recent_metrics) / len(recent_metrics)
        avg_clarity = sum(m.clarity_score for m in recent_metrics) / len(recent_metrics)
        avg_actionability = sum(m.actionability_score for m in recent_metrics) / len(recent_metrics)
        avg_processing_time = sum(m.processing_time for m in recent_metrics) / len(recent_metrics)
        
        # Group by prompt type
        prompt_type_performance = {}
        for metrics in recent_metrics:
            if metrics.prompt_type not in prompt_type_performance:
                prompt_type_performance[metrics.prompt_type] = []
            prompt_type_performance[metrics.prompt_type].append(metrics)
        
        # Calculate per-type averages
        type_summaries = {}
        for prompt_type, type_metrics in prompt_type_performance.items():
            type_summaries[prompt_type] = {
                "count": len(type_metrics),
                "avg_completeness": sum(m.completeness_score for m in type_metrics) / len(type_metrics),
                "avg_clarity": sum(m.clarity_score for m in type_metrics) / len(type_metrics),
                "avg_actionability": sum(m.actionability_score for m in type_metrics) / len(type_metrics),
                "avg_processing_time": sum(m.processing_time for m in type_metrics) / len(type_metrics)
            }
        
        return {
            "total_samples": len(recent_metrics),
            "overall_averages": {
                "completeness": round(avg_completeness, 3),
                "clarity": round(avg_clarity, 3),
                "actionability": round(avg_actionability, 3),
                "processing_time": round(avg_processing_time, 3)
            },
            "by_prompt_type": type_summaries,
            "recommendations": self._generate_recommendations(recent_metrics)
        }
    
    def _generate_recommendations(self, metrics: List[PromptMetrics]) -> List[str]:
        """Generate optimization recommendations based on performance data."""
        recommendations = []
        
        if not metrics:
            return recommendations
        
        avg_completeness = sum(m.completeness_score for m in metrics) / len(metrics)
        avg_clarity = sum(m.clarity_score for m in metrics) / len(metrics)
        avg_actionability = sum(m.actionability_score for m in metrics) / len(metrics)
        
        if avg_completeness < 0.7:
            recommendations.append("Consider longer, more detailed prompt templates to improve response completeness")
        
        if avg_clarity < 0.7:
            recommendations.append("Add more formatting guidelines to prompts to improve response clarity")
        
        if avg_actionability < 0.7:
            recommendations.append("Include more emphasis on providing concrete examples and commands")
        
        # Check for slow processing
        avg_processing_time = sum(m.processing_time for m in metrics) / len(metrics)
        if avg_processing_time > 10.0:
            recommendations.append("Consider optimizing prompt length or model configuration for better performance")
        
        return recommendations

# Global performance tracker instance
prompt_tracker = PromptPerformanceTracker()

def get_prompt_performance_summary() -> Dict[str, Any]:
    """Get current prompt performance summary."""
    return prompt_tracker.get_performance_summary()

def record_prompt_metrics(prompt_type: str, query_type: str, query: str, 
                         response: str, sources: List[Dict], processing_time: float,
                         context_length: int, session_id: str, model_used: str) -> None:
    """Record prompt performance metrics."""
    prompt_tracker.record_prompt_performance(
        prompt_type, query_type, query, response, sources, 
        processing_time, context_length, session_id, model_used
    )
