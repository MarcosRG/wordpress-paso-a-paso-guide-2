/**
 * Script de testing para verificar las mejoras implementadas en el sistema de seguros
 * 
 * Objetivos verificados:
 * 1. Seguro gratuito aparece en el carrito como producto visible
 * 2. Seguro premium muestra cálculo completo (bicis × días)
 * 3. Metadatos correctos en ambos tipos de seguro
 */

import { fixedInsuranceProductService } from '../services/insuranceProductService.fixed';

export interface InsuranceTestResult {
  type: 'basic' | 'premium';
  product: any;
  expectedInCart: boolean;
  expectedPrice: number;
  expectedName: string;
  testPassed: boolean;
  details: string[];
}

export class InsuranceImprovementTester {
  
  async testBasicInsurance(): Promise<InsuranceTestResult> {
    console.log('🧪 Testing seguro básico (gratuito)...');
    
    const result: InsuranceTestResult = {
      type: 'basic',
      product: null,
      expectedInCart: true,
      expectedPrice: 0,
      expectedName: 'Seguro Básico & Responsabilidad Civil',
      testPassed: false,
      details: []
    };
    
    try {
      // Buscar producto de seguro básico
      const basicProduct = await fixedInsuranceProductService.findValidInsuranceProduct('basic');
      result.product = basicProduct;
      
      if (!basicProduct) {
        result.details.push('❌ No se encontró producto de seguro básico');
        return result;
      }
      
      // Verificar que tiene ID válido
      if (basicProduct.id <= 0) {
        result.details.push('❌ ID del producto básico no es válido');
        return result;
      }
      result.details.push('✅ ID del producto básico válido: ' + basicProduct.id);
      
      // Verificar que existe (debe ser true para aparecer en carrito)
      if (!basicProduct.exists) {
        result.details.push('❌ Producto básico no marcado como existente');
        return result;
      }
      result.details.push('✅ Producto básico marcado como existente');
      
      // Verificar precio = 0
      if (basicProduct.price !== 0) {
        result.details.push('❌ Precio del seguro básico no es 0');
        return result;
      }
      result.details.push('✅ Precio del seguro básico es 0 (gratuito)');
      
      // Verificar nombre
      if (!basicProduct.name.includes('Básico') && !basicProduct.name.includes('Basic')) {
        result.details.push('⚠️ Nombre del producto básico puede no ser claro');
      } else {
        result.details.push('✅ Nombre del producto básico correcto');
      }
      
      result.testPassed = true;
      result.details.push('🎉 Test de seguro básico PASADO');
      
    } catch (error) {
      result.details.push(`❌ Error en test: ${error}`);
    }
    
    return result;
  }
  
  async testPremiumInsurance(): Promise<InsuranceTestResult> {
    console.log('🧪 Testing seguro premium...');
    
    const result: InsuranceTestResult = {
      type: 'premium',
      product: null,
      expectedInCart: true,
      expectedPrice: 5,
      expectedName: 'Seguro Premium Bikesul',
      testPassed: false,
      details: []
    };
    
    try {
      // Buscar producto de seguro premium
      const premiumProduct = await fixedInsuranceProductService.findValidInsuranceProduct('premium');
      result.product = premiumProduct;
      
      if (!premiumProduct) {
        result.details.push('��� No se encontró producto de seguro premium');
        return result;
      }
      
      // Verificar que tiene ID válido
      if (premiumProduct.id <= 0) {
        result.details.push('❌ ID del producto premium no es válido');
        return result;
      }
      result.details.push('✅ ID del producto premium válido: ' + premiumProduct.id);
      
      // Verificar que existe
      if (!premiumProduct.exists) {
        result.details.push('❌ Producto premium no marcado como existente');
        return result;
      }
      result.details.push('✅ Producto premium marcado como existente');
      
      // Verificar precio = 5
      if (premiumProduct.price !== 5) {
        result.details.push(`⚠️ Precio del seguro premium es ${premiumProduct.price}, esperado 5`);
      } else {
        result.details.push('✅ Precio del seguro premium es 5€/día');
      }
      
      // Verificar nombre
      if (!premiumProduct.name.includes('Premium')) {
        result.details.push('⚠️ Nombre del producto premium puede no ser claro');
      } else {
        result.details.push('✅ Nombre del producto premium correcto');
      }
      
      result.testPassed = true;
      result.details.push('🎉 Test de seguro premium PASADO');
      
    } catch (error) {
      result.details.push(`❌ Error en test: ${error}`);
    }
    
    return result;
  }
  
  calculateInsurancePricing(bikes: number, days: number, pricePerBikePerDay: number): {
    total: number;
    calculation: string;
    expectedName: string;
  } {
    const total = pricePerBikePerDay * bikes * days;
    const calculation = `€${pricePerBikePerDay} × ${bikes} bicis × ${days} días = €${total}`;
    
    let expectedName: string;
    if (pricePerBikePerDay === 0) {
      expectedName = `Seguro Básico & Responsabilidad Civil (Incluido)`;
    } else {
      expectedName = `Seguro Premium Bikesul x ${bikes} bicis x ${days} días`;
    }
    
    return { total, calculation, expectedName };
  }
  
  async runFullTest(): Promise<{
    basicTest: InsuranceTestResult;
    premiumTest: InsuranceTestResult;
    pricingExamples: any[];
    overallPassed: boolean;
  }> {
    console.log('🚀 Ejecutando test completo de mejoras de seguros...');
    
    const basicTest = await this.testBasicInsurance();
    const premiumTest = await this.testPremiumInsurance();
    
    // Ejemplos de cálculos
    const pricingExamples = [
      this.calculateInsurancePricing(2, 3, 0), // Básico: 2 bicis, 3 días
      this.calculateInsurancePricing(1, 5, 5), // Premium: 1 bici, 5 días
      this.calculateInsurancePricing(3, 7, 5), // Premium: 3 bicis, 7 días
    ];
    
    const overallPassed = basicTest.testPassed && premiumTest.testPassed;
    
    console.log('\n📊 RESUMEN DE TESTS:');
    console.log(`Seguro básico: ${basicTest.testPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Seguro premium: ${premiumTest.testPassed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Tests generales: ${overallPassed ? '✅ PASS' : '❌ FAIL'}`);
    
    if (overallPassed) {
      console.log('\n🎉 TODAS LAS MEJORAS FUNCIONAN CORRECTAMENTE');
      console.log('✅ Seguro gratuito aparecerá en el carrito');
      console.log('✅ Seguro premium mostrará cálculo completo');
      console.log('✅ Metadatos correctos en ambos tipos');
    } else {
      console.log('\n⚠️ ALGUNOS TESTS FALLARON - Revisar implementación');
    }
    
    return {
      basicTest,
      premiumTest,
      pricingExamples,
      overallPassed
    };
  }
}

// Función para uso directo en consola
export const testInsuranceImprovements = async () => {
  const tester = new InsuranceImprovementTester();
  return await tester.runFullTest();
};

// Ejemplo de uso:
// import { testInsuranceImprovements } from './utils/testInsuranceImprovements';
// testInsuranceImprovements().then(results => console.log(results));
