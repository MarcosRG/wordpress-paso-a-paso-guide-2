import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ConnectivityTest } from "./ConnectivityTest";

export const ApiTest = () => {
  const [testResult, setTestResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const testApiConnection = async () => {
    setLoading(true);
    setTestResult("Testing API connection...");

    try {
      const API_BASE = "https://bikesultoursgest.com/wp-json/wc/v3";
      const CONSUMER_KEY = "ck_d702f875c82d5973562a62579cfa284db06e3a87";
      const CONSUMER_SECRET = "cs_7a50a1dc2589e84b4ebc1d4407b3cd5b1a7b2b71";

      const auth = btoa(`${CONSUMER_KEY}:${CONSUMER_SECRET}`);
      const headers = {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      };

      console.log("Testing connection to:", API_BASE);
      console.log("Headers:", headers);

      // Test basic connectivity first
      const response = await fetch(`${API_BASE}/products?per_page=1`, {
        headers,
        mode: "cors",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setTestResult(
        `✅ API connection successful! Found ${data.length} products. Response: ${JSON.stringify(data, null, 2)}`,
      );
    } catch (error) {
      if (error instanceof Error) {
        setTestResult(`❌ API connection failed: ${error.message}`);
        console.error("API Test Error:", error);
      } else {
        setTestResult(`❌ Unknown error occurred`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-2xl mx-auto mt-4">
        <CardHeader>
          <CardTitle>API Connection Test (Legacy)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={testApiConnection}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Testing..." : "Test WooCommerce API Connection"}
          </Button>

          {testResult && (
            <div className="p-4 bg-gray-100 rounded-md">
              <pre className="whitespace-pre-wrap text-sm">{testResult}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <ConnectivityTest />
    </div>
  );
};
