import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { wooCommerceCartService } from "@/services/wooCommerceCartService";
import { insuranceProductService } from "@/services/insuranceProductService";
import { useLanguage } from "@/contexts/LanguageContext";

export const InsuranceTestDebugger = () => {
  const { t } = useLanguage();
  const [testData, setTestData] = useState({
    pricePerDay: 5,
    totalBikes: 5,
    totalDays: 5,
    insuranceType: "premium" as "premium" | "basic",
  });
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runInsuranceTest = async () => {
    setIsLoading(true);
    setResults(null);

    try {
      const expectedTotal = testData.pricePerDay * testData.totalBikes * testData.totalDays;
      
      console.log("🧪 STARTING INSURANCE TEST");
      console.log(`Expected calculation: €${testData.pricePerDay} × ${testData.totalBikes} × ${testData.totalDays} = €${expectedTotal}`);

      // Test insurance product lookup
      const insuranceProduct = await insuranceProductService.findValidInsuranceProduct(testData.insuranceType);
      
      const testResults = {
        calculation: {
          pricePerDay: testData.pricePerDay,
          totalBikes: testData.totalBikes,
          totalDays: testData.totalDays,
          expectedTotal,
        },
        productLookup: {
          found: !!insuranceProduct,
          productId: insuranceProduct?.id,
          productName: insuranceProduct?.name,
          productPrice: insuranceProduct?.price,
        },
        timestamp: new Date().toISOString(),
      };

      console.log("🧪 TEST RESULTS:", testResults);
      setResults(testResults);

    } catch (error) {
      console.error("❌ Insurance test failed:", error);
      setResults({
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>🛡️ Insurance Calculation Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="pricePerDay">Price per bike/day (€)</Label>
            <Input
              id="pricePerDay"
              type="number"
              value={testData.pricePerDay}
              onChange={(e) => setTestData(prev => ({
                ...prev,
                pricePerDay: parseFloat(e.target.value) || 0
              }))}
            />
          </div>
          <div>
            <Label htmlFor="totalBikes">Total bikes</Label>
            <Input
              id="totalBikes"
              type="number"
              value={testData.totalBikes}
              onChange={(e) => setTestData(prev => ({
                ...prev,
                totalBikes: parseInt(e.target.value) || 0
              }))}
            />
          </div>
          <div>
            <Label htmlFor="totalDays">Total days</Label>
            <Input
              id="totalDays"
              type="number"
              value={testData.totalDays}
              onChange={(e) => setTestData(prev => ({
                ...prev,
                totalDays: parseInt(e.target.value) || 0
              }))}
            />
          </div>
          <div>
            <Label htmlFor="insuranceType">Insurance type</Label>
            <select
              id="insuranceType"
              className="w-full p-2 border rounded"
              value={testData.insuranceType}
              onChange={(e) => setTestData(prev => ({
                ...prev,
                insuranceType: e.target.value as "premium" | "basic"
              }))}
            >
              <option value="premium">Premium</option>
              <option value="basic">Basic</option>
            </select>
          </div>
        </div>

        <div className="flex justify-center">
          <Button 
            onClick={runInsuranceTest} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? "Testing..." : "🧪 Run Insurance Test"}
          </Button>
        </div>

        {results && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-3">Test Results:</h3>
            
            {results.error ? (
              <div className="text-red-600">
                <strong>Error:</strong> {results.error}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <strong>Calculation:</strong><br />
                  €{results.calculation.pricePerDay} × {results.calculation.totalBikes} bikes × {results.calculation.totalDays} days = 
                  <span className="font-bold text-green-600"> €{results.calculation.expectedTotal}</span>
                </div>
                
                <div>
                  <strong>Product Lookup:</strong><br />
                  {results.productLookup.found ? (
                    <span className="text-green-600">
                      ✅ Found: {results.productLookup.productName} (ID: {results.productLookup.productId}, Base Price: €{results.productLookup.productPrice})
                    </span>
                  ) : (
                    <span className="text-red-600">
                      ❌ No insurance product found for type: {testData.insuranceType}
                    </span>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-xs text-gray-500 mt-3">
              Tested at: {results.timestamp}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 mt-4">
          <p><strong>How to use:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Set your test values above</li>
            <li>Click "Run Insurance Test" to check calculations</li>
            <li>Check browser console for detailed logs</li>
            <li>Verify insurance product exists in WooCommerce</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
