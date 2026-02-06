// ==========================================
// VULTUS SHIPPING - Sistema de Frete
// Integração com Correios e Melhor Envio
// ==========================================

// ============= CÁLCULO DE FRETE =============
const Shipping = {
  
  // Configurações
  config: {
    // Endereço de origem (sua loja)
    originZipCode: "01310-100", // Altere para seu CEP
    
    // Dimensões padrão do pacote (cm)
    defaultPackage: {
      width: 20,
      height: 10,
      length: 30,
      weight: 0.5 // kg
    },
    
    // Margens de lucro no frete
    margin: 0, // 0% = sem margem, 10 = 10% de lucro
    
    // Frete grátis
    freeShippingMinValue: 200.00
  },
  
  // Calcular dimensões do pacote baseado nos produtos
  calculatePackageDimensions(items) {
    // Simplificado: usa dimensões padrão
    // Em produção, cada produto teria suas dimensões
    const totalWeight = items.reduce((sum, item) => {
      const itemWeight = item.weight || 0.3; // peso padrão 300g
      return sum + (itemWeight * item.quantity);
    }, 0);
    
    return {
      ...this.config.defaultPackage,
      weight: Math.max(totalWeight, 0.3) // mínimo 300g
    };
  },
  
  // Buscar endereço pelo CEP (via ViaCEP)
  async getAddressByZipCode(zipCode) {
    try {
      const cleanZip = zipCode.replace(/\D/g, '');
      
      if (cleanZip.length !== 8) {
        return { success: false, error: "CEP inválido" };
      }
      
      const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
      
      if (!response.ok) {
        return { success: false, error: "Erro ao buscar CEP" };
      }
      
      const data = await response.json();
      
      if (data.erro) {
        return { success: false, error: "CEP não encontrado" };
      }
      
      return {
        success: true,
        address: {
          zipCode: data.cep,
          street: data.logradouro,
          neighborhood: data.bairro,
          city: data.localidade,
          state: data.uf,
          complement: data.complemento || ""
        }
      };
    } catch (error) {
      console.error("Erro ao buscar CEP:", error);
      return { success: false, error: "Erro de conexão" };
    }
  },
  
  // Calcular frete pelos Correios (API Simulação)
  async calculateCorreiosShipping(destinationZipCode, packageData) {
    try {
      const cleanZip = destinationZipCode.replace(/\D/g, '');
      
      // IMPORTANTE: Esta é uma simulação
      // Para produção, você precisa:
      // 1. Conta nos Correios (https://www.correios.com.br/enviar/precisa-de-ajuda/contrato-nacional)
      // 2. API oficial dos Correios
      // 3. Ou usar Melhor Envio (mais fácil)
      
      // Simulação baseada em distância aproximada
      const distance = await this.estimateDistance(
        this.config.originZipCode,
        cleanZip
      );
      
      const weight = packageData.weight;
      
      // Simulação de preços
      const sedexPrice = this.simulateSedexPrice(distance, weight);
      const pacPrice = this.simulatePacPrice(distance, weight);
      
      return {
        success: true,
        options: [
          {
            service: 'PAC',
            name: 'PAC (Correios)',
            price: pacPrice.price,
            deadline: pacPrice.deadline,
            description: 'Entrega econômica'
          },
          {
            service: 'SEDEX',
            name: 'SEDEX (Correios)',
            price: sedexPrice.price,
            deadline: sedexPrice.deadline,
            description: 'Entrega rápida'
          }
        ]
      };
    } catch (error) {
      console.error("Erro ao calcular frete:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Estimar distância entre CEPs
  async estimateDistance(originZip, destZip) {
    // Simplificação: baseado nos 2 primeiros dígitos do CEP
    const originPrefix = parseInt(originZip.substring(0, 2));
    const destPrefix = parseInt(destZip.substring(0, 2));
    
    const diff = Math.abs(originPrefix - destPrefix);
    
    if (diff === 0) return 'local'; // mesma região
    if (diff <= 5) return 'regional'; // região próxima
    if (diff <= 20) return 'nacional'; // nacional próximo
    return 'distante'; // nacional distante
  },
  
  // Simular preço SEDEX
  simulateSedexPrice(distance, weight) {
    let basePrice = 15.00;
    let deadline = 2;
    
    // Ajustar por distância
    if (distance === 'local') {
      basePrice = 12.00;
      deadline = 1;
    } else if (distance === 'regional') {
      basePrice = 18.00;
      deadline = 2;
    } else if (distance === 'nacional') {
      basePrice = 25.00;
      deadline = 3;
    } else {
      basePrice = 35.00;
      deadline = 5;
    }
    
    // Ajustar por peso
    basePrice += (weight - 0.3) * 3;
    
    // Aplicar margem
    const finalPrice = basePrice * (1 + this.config.margin / 100);
    
    return {
      price: parseFloat(finalPrice.toFixed(2)),
      deadline: `${deadline} dia${deadline > 1 ? 's' : ''} úteis`
    };
  },
  
  // Simular preço PAC
  simulatePacPrice(distance, weight) {
    let basePrice = 10.00;
    let deadline = 5;
    
    // Ajustar por distância
    if (distance === 'local') {
      basePrice = 8.00;
      deadline = 3;
    } else if (distance === 'regional') {
      basePrice = 12.00;
      deadline = 5;
    } else if (distance === 'nacional') {
      basePrice = 16.00;
      deadline = 7;
    } else {
      basePrice = 22.00;
      deadline = 10;
    }
    
    // Ajustar por peso
    basePrice += (weight - 0.3) * 2;
    
    // Aplicar margem
    const finalPrice = basePrice * (1 + this.config.margin / 100);
    
    return {
      price: parseFloat(finalPrice.toFixed(2)),
      deadline: `${deadline} dias úteis`
    };
  },
  
  // Calcular frete completo
  async calculateShipping(destinationZipCode, items, cartTotal) {
    try {
      // Verificar frete grátis
      if (cartTotal >= this.config.freeShippingMinValue) {
        return {
          success: true,
          freeShipping: true,
          options: [{
            service: 'FREE',
            name: 'Frete Grátis',
            price: 0,
            deadline: '5 a 10 dias úteis',
            description: `Compras acima de R$ ${this.config.freeShippingMinValue.toFixed(2)}`
          }]
        };
      }
      
      // Calcular dimensões do pacote
      const packageData = this.calculatePackageDimensions(items);
      
      // Calcular frete pelos Correios
      const shippingOptions = await this.calculateCorreiosShipping(
        destinationZipCode,
        packageData
      );
      
      if (!shippingOptions.success) {
        return shippingOptions;
      }
      
      return {
        success: true,
        freeShipping: false,
        options: shippingOptions.options,
        packageData: packageData
      };
    } catch (error) {
      console.error("Erro ao calcular frete:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Rastrear pedido (Correios)
  async trackOrder(trackingCode) {
    try {
      // IMPORTANTE: Esta é uma simulação
      // Para produção, use a API oficial dos Correios
      // Ou integre com Melhor Envio que tem rastreamento incluso
      
      // Simulação de rastreamento
      const events = [
        {
          date: new Date(Date.now() - 86400000 * 3).toISOString(),
          status: 'Objeto postado',
          location: 'São Paulo - SP'
        },
        {
          date: new Date(Date.now() - 86400000 * 2).toISOString(),
          status: 'Objeto em trânsito',
          location: 'Centro de distribuição - SP'
        },
        {
          date: new Date(Date.now() - 86400000).toISOString(),
          status: 'Objeto saiu para entrega',
          location: 'Unidade de destino - SP'
        }
      ];
      
      return {
        success: true,
        trackingCode: trackingCode,
        events: events,
        status: 'Em trânsito'
      };
    } catch (error) {
      console.error("Erro ao rastrear pedido:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Validar CEP
  isValidZipCode(zipCode) {
    const cleaned = zipCode.replace(/\D/g, '');
    return cleaned.length === 8;
  },
  
  // Formatar CEP
  formatZipCode(zipCode) {
    const cleaned = zipCode.replace(/\D/g, '');
    if (cleaned.length === 8) {
      return `${cleaned.substring(0, 5)}-${cleaned.substring(5)}`;
    }
    return zipCode;
  }
};

// ============= INTEGRAÇÃO MELHOR ENVIO (OPCIONAL) =============
const MelhorEnvio = {
  
  // Configuração
  config: {
    // Obtenha seu token em: https://melhorenvio.com.br/
    token: '', // Adicione seu token aqui
    apiUrl: 'https://melhorenvio.com.br/api/v2'
  },
  
  // Calcular frete
  async calculate(destinationZipCode, packageData) {
    if (!this.config.token) {
      console.warn("Token do Melhor Envio não configurado");
      return { success: false, error: "Serviço não configurado" };
    }
    
    try {
      const response = await fetch(`${this.config.apiUrl}/me/shipment/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.config.token}`
        },
        body: JSON.stringify({
          from: {
            postal_code: Shipping.config.originZipCode.replace(/\D/g, '')
          },
          to: {
            postal_code: destinationZipCode.replace(/\D/g, '')
          },
          package: {
            height: packageData.height,
            width: packageData.width,
            length: packageData.length,
            weight: packageData.weight
          }
        })
      });
      
      if (!response.ok) {
        return { success: false, error: "Erro ao calcular frete" };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        options: data.map(option => ({
          service: option.company.name,
          name: option.name,
          price: parseFloat(option.price),
          deadline: `${option.delivery_time} dias úteis`,
          description: option.company.name
        }))
      };
    } catch (error) {
      console.error("Erro Melhor Envio:", error);
      return { success: false, error: error.message };
    }
  }
};

// ============= EXPORTAÇÕES =============
export { Shipping, MelhorEnvio };
