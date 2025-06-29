
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Phone, MapPin, CreditCard } from 'lucide-react';

interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

interface PurchaseFormProps {
  onCustomerDataChange: (data: CustomerData) => void;
  customerData: CustomerData;
}

export const PurchaseForm = ({ onCustomerDataChange, customerData }: PurchaseFormProps) => {
  const handleInputChange = (field: keyof CustomerData, value: string) => {
    onCustomerDataChange({
      ...customerData,
      [field]: value
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Datos de Contacto</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos Personales */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información Personal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nombre *</Label>
                <Input
                  id="firstName"
                  value={customerData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Apellidos *</Label>
                <Input
                  id="lastName"
                  value={customerData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Tus apellidos"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email *
              </Label>
              <Input
                id="email"
                type="email"
                value={customerData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Teléfono *
              </Label>
              <Input
                id="phone"
                type="tel"
                value={customerData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+34 600 000 000"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Dirección */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Dirección
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="address">Dirección</Label>
              <Input
                id="address"
                value={customerData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Calle, número, piso..."
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={customerData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  placeholder="Tu ciudad"
                />
              </div>
              <div>
                <Label htmlFor="postalCode">Código Postal</Label>
                <Input
                  id="postalCode"
                  value={customerData.postalCode}
                  onChange={(e) => handleInputChange('postalCode', e.target.value)}
                  placeholder="00000"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información de Pago */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Información de Pago
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> El pago se procesará de forma segura a través de WooCommerce. 
              Serás redirigido a la página de pago después de confirmar tu reserva.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export type { CustomerData };
