import React, { useState } from 'react';
import { Button } from './ui/button';
import { verifyInsuranceProducts } from '../utils/verifyInsuranceProducts';
import { findRealInsuranceProducts, generateFixCode } from '../services/insuranceTemporaryFix';

export const InsuranceVerifier: React.FC = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationComplete, setVerificationComplete] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerificationComplete(false);

    try {
      console.log("=".repeat(60));
      console.log("🔧 DIAGNÓSTICO COMPLETO DE SEGUROS");
      console.log("=".repeat(60));

      // 1. Verificación detallada
      await verifyInsuranceProducts();

      console.log("\n" + "=".repeat(60));
      console.log("🛠️ GENERANDO SOLUCIÓN AUTOMÁTICA");
      console.log("=".repeat(60));

      // 2. Encontrar productos reales y generar código de fix
      const realProducts = await findRealInsuranceProducts();
      const fixCode = generateFixCode(realProducts.premium, realProducts.basic);

      console.log(fixCode);

      setVerificationComplete(true);
    } catch (error) {
      console.error('Error durante la verificación:', error);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-yellow-800 mb-2">
        🔧 Verificador de Productos de Seguro
      </h3>
      <p className="text-sm text-yellow-700 mb-4">
        Este componente temporal verifica si existen los productos de seguro en WooCommerce.
        Revisa la consola del navegador para ver los resultados detallados.
      </p>
      
      <Button
        onClick={handleVerify}
        disabled={isVerifying}
        variant="outline"
        className="mr-2"
      >
        {isVerifying ? 'Verificando...' : 'Verificar Productos de Seguro'}
      </Button>
      
      {verificationComplete && (
        <span className="text-green-600 text-sm font-medium">
          ✅ Verificación completada - Revisa la consola
        </span>
      )}
    </div>
  );
};
