const mongoose = require('mongoose');

// Schema para os itens do pedido
const ItemSchema = new mongoose.Schema({
    productId: { 
        type: Number, 
        required: true 
    },
    quantity: { 
        type: Number, 
        required: true 
    },
    price: { 
        type: Number, 
        required: true 
    }
});

// Schema principal do pedido
const OrderSchema = new mongoose.Schema({
    orderId: { 
        type: String, 
        required: true, 
        unique: true // Garante que não teremos IDs de pedido duplicados
    },
    value: { 
        type: Number, 
        required: true 
    },
    creationDate: { 
        type: Date, 
        required: true 
    },
    items: [ItemSchema] // Incorpora o array de itens definido acima
});

module.exports = mongoose.model('Order', OrderSchema);
