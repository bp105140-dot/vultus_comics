// ==========================================
// VULTUS PAYMENTS - Sistema de Pagamentos
// Integrações: Stripe, Mercado Pago, PagSeguro
// ==========================================

// ============= PAGAMENTO COM CARTÃO (STRIPE) =============
const StripePayment = {
  
  // Configuração
  config: {
    // Obtenha suas chaves em: https://dashboard.stripe.com/apikeys
    publishableKey: '', // pk_test_... ou pk_live_...
    secretKey: '', // sk_test_... ou sk_live_... (NUNCA exponha no frontend!)
    currency: 'brl'
  },
  
  // Inicializar Stripe
  async initialize() {
    if (!window.Stripe) {
      // Carregar script do Stripe
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      document.head.appendChild(script);
      
      await new Promise(resolve => {
        script.onload = resolve;
      });
    }
    
    if (!this.config.publishableKey) {
      console.warn("Chave pública do Stripe não configurada");
      return null;
    }
    
    this.stripe = window.Stripe(this.config.publishableKey);
    return this.stripe;
  },
  
  // Criar Payment Intent (backend necessário)
  async createPaymentIntent(amount, orderData) {
    try {
      // IMPORTANTE: Esta chamada deve ser feita do seu BACKEND
      // Nunca exponha sua chave secreta no frontend!
      
      // Exemplo de endpoint que você deve criar:
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // centavos
          currency: this.config.currency,
          metadata: {
            orderId: orderData.orderId,
            customerEmail: orderData.customerEmail
          }
        })
      });
      
      if (!response.ok) {
        return { success: false, error: "Erro ao processar pagamento" };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        clientSecret: data.clientSecret
      };
    } catch (error) {
      console.error("Erro Payment Intent:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Processar pagamento
  async processPayment(cardElement, clientSecret) {
    try {
      if (!this.stripe) {
        await this.initialize();
      }
      
      const result = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement
        }
      });
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }
      
      return {
        success: true,
        paymentIntent: result.paymentIntent
      };
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      return { success: false, error: error.message };
    }
  }
};

// ============= MERCADO PAGO =============
const MercadoPagoPayment = {
  
  // Configuração
  config: {
    // Obtenha em: https://www.mercadopago.com.br/developers
    publicKey: '', // TEST-... ou APP_USR-...
    accessToken: '' // Apenas no backend!
  },
  
  // Inicializar Mercado Pago
  async initialize() {
    if (!window.MercadoPago) {
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.async = true;
      document.head.appendChild(script);
      
      await new Promise(resolve => {
        script.onload = resolve;
      });
    }
    
    if (!this.config.publicKey) {
      console.warn("Chave pública do Mercado Pago não configurada");
      return null;
    }
    
    this.mp = new window.MercadoPago(this.config.publicKey);
    return this.mp;
  },
  
  // Criar preferência de pagamento (backend)
  async createPreference(orderData) {
    try {
      // Esta chamada deve ser feita do BACKEND
      const response = await fetch('/api/mercadopago/create-preference', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          items: orderData.items.map(item => ({
            title: item.productName,
            quantity: item.quantity,
            unit_price: parseFloat(item.price),
            currency_id: 'BRL'
          })),
          payer: {
            email: orderData.customerEmail,
            name: orderData.customerName,
            phone: {
              number: orderData.customerPhone
            }
          },
          back_urls: {
            success: `${window.location.origin}/pedido-confirmado`,
            failure: `${window.location.origin}/checkout`,
            pending: `${window.location.origin}/pedido-pendente`
          },
          auto_return: 'approved',
          external_reference: orderData.orderId
        })
      });
      
      if (!response.ok) {
        return { success: false, error: "Erro ao criar pagamento" };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        preferenceId: data.id,
        initPoint: data.init_point
      };
    } catch (error) {
      console.error("Erro Mercado Pago:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Redirecionar para checkout
  redirectToCheckout(preferenceId) {
    if (!this.mp) {
      console.error("Mercado Pago não inicializado");
      return;
    }
    
    this.mp.checkout({
      preference: {
        id: preferenceId
      },
      autoOpen: true
    });
  }
};

// ============= PAGSEGURO =============
const PagSeguroPayment = {
  
  // Configuração
  config: {
    // Obtenha em: https://pagseguro.uol.com.br/
    email: '', // Seu email PagSeguro
    token: '', // Token de produção ou sandbox
    sandbox: true // true para testes
  },
  
  // Inicializar PagSeguro
  async initialize() {
    const scriptSrc = this.config.sandbox
      ? 'https://stc.sandbox.pagseguro.uol.com.br/pagseguro/api/v2/checkout/pagseguro.directpayment.js'
      : 'https://stc.pagseguro.uol.com.br/pagseguro/api/v2/checkout/pagseguro.directpayment.js';
    
    if (!window.PagSeguroDirectPayment) {
      const script = document.createElement('script');
      script.src = scriptSrc;
      script.async = true;
      document.head.appendChild(script);
      
      await new Promise(resolve => {
        script.onload = resolve;
      });
    }
    
    return window.PagSeguroDirectPayment;
  },
  
  // Criar sessão (backend)
  async createSession() {
    try {
      const response = await fetch('/api/pagseguro/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        return { success: false, error: "Erro ao criar sessão" };
      }
      
      const data = await response.json();
      
      window.PagSeguroDirectPayment.setSessionId(data.sessionId);
      
      return {
        success: true,
        sessionId: data.sessionId
      };
    } catch (error) {
      console.error("Erro PagSeguro:", error);
      return { success: false, error: error.message };
    }
  }
};

// ============= PIX =============
const PixPayment = {
  
  // Gerar QR Code PIX (backend necessário)
  async generatePixPayment(amount, orderData) {
    try {
      // Esta chamada deve ser feita do BACKEND
      // Aqui você integraria com sua instituição financeira
      
      const response = await fetch('/api/pix/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          orderId: orderData.orderId,
          customerName: orderData.customerName,
          customerCPF: orderData.customerCPF
        })
      });
      
      if (!response.ok) {
        return { success: false, error: "Erro ao gerar PIX" };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        pixCode: data.pixCode, // Código PIX Copia e Cola
        qrCode: data.qrCodeBase64, // QR Code em base64
        expiresAt: data.expiresAt
      };
    } catch (error) {
      console.error("Erro PIX:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Verificar status do pagamento PIX
  async checkPixPaymentStatus(orderId) {
    try {
      const response = await fetch(`/api/pix/status/${orderId}`);
      
      if (!response.ok) {
        return { success: false, error: "Erro ao verificar status" };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        paid: data.paid,
        paidAt: data.paidAt
      };
    } catch (error) {
      console.error("Erro ao verificar PIX:", error);
      return { success: false, error: error.message };
    }
  }
};

// ============= BOLETO =============
const BoletoPayment = {
  
  // Gerar boleto (backend necessário)
  async generateBoleto(amount, orderData) {
    try {
      // Esta chamada deve ser feita do BACKEND
      const response = await fetch('/api/boleto/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          orderId: orderData.orderId,
          customerName: orderData.customerName,
          customerCPF: orderData.customerCPF,
          customerAddress: orderData.shippingAddress,
          dueDate: this.calculateDueDate(3) // 3 dias para vencimento
        })
      });
      
      if (!response.ok) {
        return { success: false, error: "Erro ao gerar boleto" };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        boletoUrl: data.boletoUrl, // URL do PDF
        digitableLine: data.digitableLine, // Linha digitável
        barCode: data.barCode, // Código de barras
        dueDate: data.dueDate
      };
    } catch (error) {
      console.error("Erro Boleto:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Calcular data de vencimento
  calculateDueDate(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
};

// ============= GERENCIADOR DE PAGAMENTOS =============
const PaymentManager = {
  
  // Processar pagamento baseado no método escolhido
  async processPayment(method, amount, orderData, paymentData = {}) {
    try {
      switch (method) {
        case 'credit_card':
          // Stripe ou outro gateway
          return await this.processCreditCard(amount, orderData, paymentData);
          
        case 'pix':
          return await PixPayment.generatePixPayment(amount, orderData);
          
        case 'boleto':
          return await BoletoPayment.generateBoleto(amount, orderData);
          
        case 'mercadopago':
          return await MercadoPagoPayment.createPreference(orderData);
          
        default:
          return { success: false, error: "Método de pagamento inválido" };
      }
    } catch (error) {
      console.error("Erro ao processar pagamento:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Processar cartão de crédito
  async processCreditCard(amount, orderData, cardData) {
    // Aqui você escolhe qual gateway usar
    // Exemplo com Stripe:
    
    if (!StripePayment.config.publishableKey) {
      return { 
        success: false, 
        error: "Gateway de pagamento não configurado" 
      };
    }
    
    const intent = await StripePayment.createPaymentIntent(amount, orderData);
    
    if (!intent.success) {
      return intent;
    }
    
    // O processamento final seria feito com o cardElement do Stripe
    // Aqui é apenas a estrutura
    
    return {
      success: true,
      paymentMethod: 'credit_card',
      requiresAction: true,
      clientSecret: intent.clientSecret
    };
  },
  
  // Validar dados do cartão
  validateCardData(cardData) {
    const errors = [];
    
    // Validar número do cartão (Luhn algorithm)
    if (!this.isValidCardNumber(cardData.number)) {
      errors.push("Número do cartão inválido");
    }
    
    // Validar validade
    if (!this.isValidExpiry(cardData.expiry)) {
      errors.push("Data de validade inválida");
    }
    
    // Validar CVV
    if (!this.isValidCVV(cardData.cvv)) {
      errors.push("CVV inválido");
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  },
  
  // Algoritmo de Luhn para validar cartão
  isValidCardNumber(number) {
    const cleaned = number.replace(/\s/g, '');
    
    if (!/^\d{13,19}$/.test(cleaned)) {
      return false;
    }
    
    let sum = 0;
    let isEven = false;
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  },
  
  // Validar data de validade
  isValidExpiry(expiry) {
    const match = expiry.match(/^(\d{2})\/(\d{2,4})$/);
    if (!match) return false;
    
    const month = parseInt(match[1]);
    let year = parseInt(match[2]);
    
    if (year < 100) {
      year += 2000;
    }
    
    if (month < 1 || month > 12) {
      return false;
    }
    
    const now = new Date();
    const expDate = new Date(year, month - 1);
    
    return expDate >= now;
  },
  
  // Validar CVV
  isValidCVV(cvv) {
    return /^\d{3,4}$/.test(cvv);
  },
  
  // Detectar bandeira do cartão
  detectCardBrand(number) {
    const cleaned = number.replace(/\s/g, '');
    
    const patterns = {
      visa: /^4/,
      mastercard: /^5[1-5]/,
      amex: /^3[47]/,
      elo: /^(4011|4312|4389|4514|4576|5041|5066|5067|6277|6362|6363|6504|6505|6516)/,
      hipercard: /^(384100|384140|384160|606282|637095|637568|60)/,
      discover: /^6(?:011|5)/,
      diners: /^3(?:0[0-5]|[68])/
    };
    
    for (const [brand, pattern] of Object.entries(patterns)) {
      if (pattern.test(cleaned)) {
        return brand;
      }
    }
    
    return 'unknown';
  },
  
  // Formatar número do cartão
  formatCardNumber(number) {
    const cleaned = number.replace(/\s/g, '');
    const parts = cleaned.match(/.{1,4}/g);
    return parts ? parts.join(' ') : cleaned;
  },
  
  // Mascarar número do cartão
  maskCardNumber(number) {
    const cleaned = number.replace(/\s/g, '');
    const last4 = cleaned.slice(-4);
    return `**** **** **** ${last4}`;
  }
};

// ============= EXPORTAÇÕES =============
export { 
  PaymentManager,
  StripePayment,
  MercadoPagoPayment,
  PagSeguroPayment,
  PixPayment,
  BoletoPayment
};
