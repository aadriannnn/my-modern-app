import React from 'react';
import AnalysisResults from '../components/AnalysisResults';

// Mock data to test charts and tables
const mockData = {
    results: {
        total_cases_analyzed: 100,
        mean_sentence_years: "5.5"
    },
    interpretation: "This is a test interpretation showing that charts and tables are working.",
    charts: [
        {
            type: "pie_chart",
            title: "Distribution (Pie)",
            data: {
                labels: ["A", "B", "C"],
                values: [30, 50, 20]
            }
        },
        {
            type: "bar_chart",
            title: "Comparison (Bar)",
            data: {
                labels: ["X", "Y", "Z"],
                values: [10, 25, 15]
            }
        }
    ],
    tables: [
        {
            title: "Detailed Statistics",
            columns: ["Category", "Value", "Notes"],
            rows: [
                ["Cat 1", "100", "High"],
                ["Cat 2", "50", "Medium"]
            ]
        }
    ]
};

export default function TestPage() {
    return (
        <div className="p-8 bg-gray-100 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Analysis Results Test - Fixed</h1>
            <div className="max-w-4xl mx-auto">
                <AnalysisResults data={mockData} />
            </div>
        </div>
    );
}
