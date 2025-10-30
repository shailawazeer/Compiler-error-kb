import React, { useState } from "react";

const API_BASE = "http://localhost:5000";

export default function App() {
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState("auto");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!query.trim())
      return setError("Please enter an error or compiler output");

    setLoading(true);
    console.log("🔍 Sending request to:", `${API_BASE}/api/errors`);
    console.log("📦 Payload:", { query, programming_language: language });

    try {
      const resp = await fetch(`${API_BASE}/api/errors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, programming_language: language }),
      });

      console.log("📡 Response status:", resp.status);
      const data = await resp.json();
      console.log("📦 Response data:", data);

      if (!resp.ok) throw new Error(data.message || "Request failed");
      setResult(data);
    } catch (err) {
      console.error("❌ Error details:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="min-h-screen bg-gray-50 p-6 font-sans">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold">
            🔧 Compiler Error Knowledge Base
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Paste your compiler error or code output and get AI-powered
            solutions.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Programming Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="auto">Auto detect</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Compiler Error / Query
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              rows={8}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
              placeholder={`Example:\nerror: expected ';' before '}' token\n  }\n  ^\nAt line 42 in main.cpp`}
            />
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
              disabled={loading}
            >
              {loading ? "🔍 Analyzing..." : "Get Solution"}
            </button>

            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResult(null);
                setError(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>

            <div className="ml-auto text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded">
              API: {API_BASE}
            </div>
          </div>
        </form>

        <section className="mt-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              <strong className="font-semibold">Error:</strong> {error}
            </div>
          )}

          {result && (
            <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  Source: <span className="text-blue-600">{result.source}</span>
                </span>
              </div>

              <div className="p-4 bg-white">
                {result.data && result.data.solution_text ? (
                  <div className="prose max-w-none">
                    <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded text-sm border border-gray-200 font-mono">
                      {result.data.solution_text}
                    </pre>
                  </div>
                ) : (
                  <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded text-sm border border-gray-200 overflow-x-auto">
                    {JSON.stringify(result.data, null, 2)}
                  </pre>
                )}

                {result.data && result.data.id && (
                  <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                    ✓ Saved to database with ID:{" "}
                    <code className="font-mono font-semibold">
                      {result.data.id}
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}

          {!result && !error && !loading && (
            <div className="mt-4 text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <div className="text-4xl mb-2">💡</div>
              <p className="text-sm">
                No results yet — submit a query to get started
              </p>
            </div>
          )}
        </section>

        <footer className="mt-8 pt-4 border-t border-gray-200 text-xs text-gray-500 text-center">
          Compiler Error KB powered by Gemini AI • Search, Save, and Learn from
          your errors
        </footer>
      </div>
    </div>
  );
}
