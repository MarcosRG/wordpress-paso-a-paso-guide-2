// Utilidades de seguridad para validación y sanitización de inputs

// Sanitizar strings para prevenir XSS
export const sanitizeString = (input: string): string => {
  if (typeof input !== "string") return "";

  return input
    .trim()
    .replace(/[<>\"'&]/g, (match) => {
      const entities: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#x27;",
        "&": "&amp;",
      };
      return entities[match] || match;
    })
    .substring(0, 1000); // Limitar longitud
};

// Validar email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email) && email.length <= 254;
};

// Validar teléfono (formato internacional)
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-()]/g, ""));
};

// Validar nombre (solo letras, espacios, acentos)
export const isValidName = (name: string): boolean => {
  const nameRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{1,50}$/;
  return nameRegex.test(name.trim());
};

// Validar código postal portugués
export const isValidPostalCode = (postalCode: string): boolean => {
  const postalRegex = /^\d{4}-\d{3}$/;
  return postalRegex.test(postalCode);
};

// Sanitizar input numérico
export const sanitizeNumber = (input: string | number): number => {
  const num = typeof input === "string" ? parseFloat(input) : input;
  return isNaN(num) ? 0 : Math.max(0, Math.min(999999, num));
};

// Validar ID de producto
export const isValidProductId = (id: string | number): boolean => {
  const numId = typeof id === "string" ? parseInt(id) : id;
  return Number.isInteger(numId) && numId > 0 && numId < 999999999;
};

// Sanitizar datos del cliente
export const sanitizeCustomerData = (data: any): any => {
  if (!data || typeof data !== "object") return {};

  return {
    firstName: sanitizeString(data.firstName || ""),
    lastName: sanitizeString(data.lastName || ""),
    email: sanitizeString(data.email || "").toLowerCase(),
    phone: sanitizeString(data.phone || "").replace(/[^\d\+\-\s()]/g, ""),
    address: sanitizeString(data.address || ""),
    city: sanitizeString(data.city || ""),
    postalCode: sanitizeString(data.postalCode || "").replace(/[^\d\-]/g, ""),
    country: sanitizeString(data.country || "Portugal"),
  };
};

// Validar estructura de datos del cliente
export const validateCustomerData = (
  data: any,
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data) {
    errors.push("Customer data is required");
    return { isValid: false, errors };
  }

  if (!isValidName(data.firstName)) {
    errors.push("First name is invalid or too long");
  }

  if (!isValidName(data.lastName)) {
    errors.push("Last name is invalid or too long");
  }

  if (!isValidEmail(data.email)) {
    errors.push("Email format is invalid");
  }

  if (!isValidPhone(data.phone)) {
    errors.push("Phone number format is invalid");
  }

  if (data.postalCode && !isValidPostalCode(data.postalCode)) {
    errors.push("Postal code format is invalid (should be XXXX-XXX)");
  }

  return { isValid: errors.length === 0, errors };
};

// Sanitizar parámetros de URL
export const sanitizeUrlParam = (param: string): string => {
  return encodeURIComponent(param.replace(/[^a-zA-Z0-9\-_]/g, ""));
};

// Rate limiting simple (cliente)
const requestCounts = new Map<string, { count: number; timestamp: number }>();

export const checkRateLimit = (
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000,
): boolean => {
  const now = Date.now();
  const record = requestCounts.get(key);

  if (!record || now - record.timestamp > windowMs) {
    requestCounts.set(key, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count++;
  return true;
};

// Limpiar datos sensibles del log
export const sanitizeForLog = (data: any): any => {
  if (!data || typeof data !== "object") return data;

  const sensitiveKeys = [
    "password",
    "token",
    "key",
    "secret",
    "auth",
    "credential",
  ];
  const sanitized = { ...data };

  Object.keys(sanitized).forEach((key) => {
    if (
      sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))
    ) {
      sanitized[key] = "[REDACTED]";
    }
  });

  return sanitized;
};

// Encriptar datos para localStorage (simple)
export const encryptData = (data: any): string => {
  try {
    const key =
      import.meta.env.VITE_ENCRYPTION_KEY || "default-key-change-in-production";
    const jsonString = JSON.stringify(data);

    // Simple XOR encryption (para datos no críticos)
    let encrypted = "";
    for (let i = 0; i < jsonString.length; i++) {
      encrypted += String.fromCharCode(
        jsonString.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }

    return btoa(encrypted);
  } catch (error) {
    console.error("Encryption failed:", error);
    return "";
  }
};

// Desencriptar datos de localStorage
export const decryptData = (encryptedData: string): any => {
  try {
    const key =
      import.meta.env.VITE_ENCRYPTION_KEY || "default-key-change-in-production";
    const encrypted = atob(encryptedData);

    let decrypted = "";
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(
        encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length),
      );
    }

    return JSON.parse(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};
