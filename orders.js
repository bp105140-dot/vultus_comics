// ==========================================
// VULTUS ORDERS - Sistema de Pedidos
// Gestão completa de pedidos do e-commerce
// ==========================================

import { 
  getFirestore, 
  collection, 
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { db } from "./auth.js";

// ============= SISTEMA DE PEDIDOS =============
const Orders = {
  
  // Criar novo pedido
  async createOrder(orderData) {
    try {
      const order = {
        // Dados do cliente
        userId: orderData.userId,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        customerCPF: orderData.customerCPF || "",
        
        // Endereço de entrega
        shippingAddress: {
          street: orderData.shippingAddress.street,
          number: orderData.shippingAddress.number,
          complement: orderData.shippingAddress.complement || "",
          neighborhood: orderData.shippingAddress.neighborhood,
          city: orderData.shippingAddress.city,
          state: orderData.shippingAddress.state,
          zipCode: orderData.shippingAddress.zipCode,
          country: orderData.shippingAddress.country || "Brasil"
        },
        
        // Produtos
        items: orderData.items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage || "",
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          size: item.size || "",
          color: item.color || "",
          subtotal: parseFloat(item.price) * parseInt(item.quantity)
        })),
        
        // Valores
        subtotal: parseFloat(orderData.subtotal),
        shippingCost: parseFloat(orderData.shippingCost || 0),
        discount: parseFloat(orderData.discount || 0),
        total: parseFloat(orderData.total),
        
        // Envio
        shippingMethod: orderData.shippingMethod || "",
        shippingDeadline: orderData.shippingDeadline || "",
        trackingCode: orderData.trackingCode || "",
        
        // Pagamento
        paymentMethod: orderData.paymentMethod,
        paymentStatus: orderData.paymentStatus || "pending", // pending, approved, failed, refunded
        transactionId: orderData.transactionId || "",
        
        // Cupom de desconto
        couponCode: orderData.couponCode || "",
        
        // Status do pedido
        status: orderData.status || "pending", // pending, confirmed, processing, shipped, delivered, cancelled
        
        // Datas
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Observações
        notes: orderData.notes || "",
        
        // Histórico de status
        statusHistory: [{
          status: "pending",
          date: new Date().toISOString(),
          note: "Pedido criado"
        }]
      };
      
      const docRef = await addDoc(collection(db, "orders"), order);
      
      return { 
        success: true, 
        orderId: docRef.id,
        orderNumber: this.generateOrderNumber(docRef.id)
      };
    } catch (error) {
      console.error("Erro ao criar pedido:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Buscar pedido por ID
  async getOrder(orderId) {
    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (orderDoc.exists()) {
        return { 
          success: true, 
          order: {
            id: orderDoc.id,
            ...orderDoc.data()
          }
        };
      }
      return { success: false, error: "Pedido não encontrado" };
    } catch (error) {
      console.error("Erro ao buscar pedido:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Buscar pedidos do usuário
  async getUserOrders(userId, limitCount = 50) {
    try {
      const q = query(
        collection(db, "orders"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const orders = [];
      
      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          orderNumber: this.generateOrderNumber(doc.id),
          ...doc.data()
        });
      });
      
      return { success: true, orders };
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Buscar todos os pedidos (admin)
  async getAllOrders(limitCount = 100) {
    try {
      const q = query(
        collection(db, "orders"),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const orders = [];
      
      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          orderNumber: this.generateOrderNumber(doc.id),
          ...doc.data()
        });
      });
      
      return { success: true, orders };
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Atualizar status do pedido
  async updateOrderStatus(orderId, newStatus, note = "") {
    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (!orderDoc.exists()) {
        return { success: false, error: "Pedido não encontrado" };
      }
      
      const orderData = orderDoc.data();
      const statusHistory = orderData.statusHistory || [];
      
      // Adicionar ao histórico
      statusHistory.push({
        status: newStatus,
        date: new Date().toISOString(),
        note: note || this.getStatusLabel(newStatus)
      });
      
      await updateDoc(doc(db, "orders", orderId), {
        status: newStatus,
        statusHistory: statusHistory,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Atualizar código de rastreio
  async updateTrackingCode(orderId, trackingCode) {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        trackingCode: trackingCode,
        updatedAt: serverTimestamp()
      });
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar rastreio:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Atualizar status de pagamento
  async updatePaymentStatus(orderId, paymentStatus, transactionId = "") {
    try {
      const updateData = {
        paymentStatus: paymentStatus,
        updatedAt: serverTimestamp()
      };
      
      if (transactionId) {
        updateData.transactionId = transactionId;
      }
      
      await updateDoc(doc(db, "orders", orderId), updateData);
      
      // Se pagamento aprovado, atualizar status do pedido
      if (paymentStatus === "approved") {
        await this.updateOrderStatus(orderId, "confirmed", "Pagamento confirmado");
      }
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Cancelar pedido
  async cancelOrder(orderId, reason = "") {
    try {
      await this.updateOrderStatus(orderId, "cancelled", reason || "Pedido cancelado");
      
      return { success: true };
    } catch (error) {
      console.error("Erro ao cancelar pedido:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Gerar número do pedido
  generateOrderNumber(orderId) {
    // Pega os últimos 8 caracteres do ID e adiciona prefixo
    const shortId = orderId.slice(-8).toUpperCase();
    return `VU${shortId}`;
  },
  
  // Labels de status
  getStatusLabel(status) {
    const labels = {
      'pending': 'Pedido Recebido',
      'confirmed': 'Pagamento Confirmado',
      'processing': 'Em Separação',
      'shipped': 'Enviado',
      'delivered': 'Entregue',
      'cancelled': 'Cancelado'
    };
    return labels[status] || status;
  },
  
  // Cor do status
  getStatusColor(status) {
    const colors = {
      'pending': '#FFA500',
      'confirmed': '#4CAF50',
      'processing': '#2196F3',
      'shipped': '#9C27B0',
      'delivered': '#4CAF50',
      'cancelled': '#F44336'
    };
    return colors[status] || '#888888';
  },
  
  // Buscar pedidos por status (admin)
  async getOrdersByStatus(status, limitCount = 50) {
    try {
      const q = query(
        collection(db, "orders"),
        where("status", "==", status),
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const orders = [];
      
      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          orderNumber: this.generateOrderNumber(doc.id),
          ...doc.data()
        });
      });
      
      return { success: true, orders };
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Calcular estatísticas (admin)
  async getOrderStats() {
    try {
      const allOrders = await this.getAllOrders(1000);
      
      if (!allOrders.success) {
        return { success: false, error: allOrders.error };
      }
      
      const orders = allOrders.orders;
      
      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        confirmed: orders.filter(o => o.status === 'confirmed').length,
        processing: orders.filter(o => o.status === 'processing').length,
        shipped: orders.filter(o => o.status === 'shipped').length,
        delivered: orders.filter(o => o.status === 'delivered').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        totalRevenue: orders
          .filter(o => o.paymentStatus === 'approved')
          .reduce((sum, o) => sum + (o.total || 0), 0),
        averageTicket: 0
      };
      
      if (stats.total > 0) {
        stats.averageTicket = stats.totalRevenue / stats.total;
      }
      
      return { success: true, stats };
    } catch (error) {
      console.error("Erro ao calcular estatísticas:", error);
      return { success: false, error: error.message };
    }
  }
};

// ============= SISTEMA DE CUPONS =============
const Coupons = {
  
  // Criar cupom
  async createCoupon(couponData) {
    try {
      const coupon = {
        code: couponData.code.toUpperCase(),
        type: couponData.type, // percentage, fixed
        value: parseFloat(couponData.value),
        minPurchase: parseFloat(couponData.minPurchase || 0),
        maxDiscount: parseFloat(couponData.maxDiscount || 0),
        usageLimit: parseInt(couponData.usageLimit || 0),
        usageCount: 0,
        active: true,
        validFrom: couponData.validFrom || new Date().toISOString(),
        validUntil: couponData.validUntil || null,
        createdAt: serverTimestamp()
      };
      
      const docRef = await addDoc(collection(db, "coupons"), coupon);
      
      return { success: true, couponId: docRef.id };
    } catch (error) {
      console.error("Erro ao criar cupom:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Validar cupom
  async validateCoupon(code, cartTotal) {
    try {
      const q = query(
        collection(db, "coupons"),
        where("code", "==", code.toUpperCase()),
        where("active", "==", true),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: "Cupom inválido ou expirado" };
      }
      
      const couponDoc = querySnapshot.docs[0];
      const coupon = couponDoc.data();
      
      // Verificar validade
      const now = new Date();
      if (coupon.validFrom && new Date(coupon.validFrom) > now) {
        return { success: false, error: "Cupom ainda não válido" };
      }
      if (coupon.validUntil && new Date(coupon.validUntil) < now) {
        return { success: false, error: "Cupom expirado" };
      }
      
      // Verificar limite de uso
      if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
        return { success: false, error: "Cupom esgotado" };
      }
      
      // Verificar valor mínimo
      if (coupon.minPurchase > 0 && cartTotal < coupon.minPurchase) {
        return { 
          success: false, 
          error: `Valor mínimo de compra: R$ ${coupon.minPurchase.toFixed(2)}` 
        };
      }
      
      // Calcular desconto
      let discount = 0;
      if (coupon.type === 'percentage') {
        discount = (cartTotal * coupon.value) / 100;
        if (coupon.maxDiscount > 0 && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        discount = coupon.value;
      }
      
      return { 
        success: true, 
        discount: discount,
        couponId: couponDoc.id,
        couponData: coupon
      };
    } catch (error) {
      console.error("Erro ao validar cupom:", error);
      return { success: false, error: error.message };
    }
  },
  
  // Incrementar uso do cupom
  async incrementCouponUsage(couponId) {
    try {
      const couponDoc = await getDoc(doc(db, "coupons", couponId));
      if (couponDoc.exists()) {
        const currentCount = couponDoc.data().usageCount || 0;
        await updateDoc(doc(db, "coupons", couponId), {
          usageCount: currentCount + 1
        });
      }
      return { success: true };
    } catch (error) {
      console.error("Erro ao incrementar uso:", error);
      return { success: false, error: error.message };
    }
  }
};

// ============= EXPORTAÇÕES =============
export { Orders, Coupons };
