const express = require('express');
const mongoose = require('mongoose');
const Order = require('./models/Order');

const app = express();
app.use(express.json());

// ==========================================
// BANCO DE DADOS
// ==========================================
// Conecta no MongoDB local conforme padrão
mongoose.connect('mongodb://localhost:27017/jitterbit')
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch(err => console.error('❌ Erro no MongoDB:', err));


// ==========================================
// ENDPOINT: CRIAR PEDIDO (Obrigatório)
// URL: http://localhost:3000/order
// ==========================================
app.post('/order', async (req, res) => {
    try {
        const { numeroPedido, valorTotal, dataCriacao, items } = req.body;

        // Validação básica dos dados recebidos
        if (!numeroPedido || !valorTotal || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: "Bad Request", message: "Formato de JSON inválido ou campos ausentes." });
        }

        // DATA MAPPING: Transforma do Português (Entrada) para Inglês (Banco de Dados)
        const mappedItems = items.map(item => ({
            productId: Number(item.idItem), // Converte a string "2434" para número real 2434
            quantity: item.quantidadeItem,
            price: item.valorItem
        }));

        // Monta o objeto final para o MongoDB
        const newOrder = new Order({
            orderId: numeroPedido,
            value: valorTotal,
            creationDate: new Date(dataCriacao),
            items: mappedItems
        });

        const savedOrder = await newOrder.save();
        
        return res.status(201).json({ message: "Pedido processado com sucesso!", order: savedOrder });
    } catch (error) {
        // Tratamento se tentar criar um pedido com número repetido
        if (error.code === 11000) {
            return res.status(409).json({ error: "Conflict", message: "Este pedido já está cadastrado." });
        }
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


// ==========================================
// ENDPOINT: LISTAR TODOS OS PEDIDOS (Opcional)
// URL: http://localhost:3000/order/list
// Nota: Colocamos antes do /order/:id para o Express não confundir a palavra "list" com um ID
// ==========================================
app.get('/order/list', async (req, res) => {
    try {
        const orders = await Order.find();
        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


// ==========================================
// ENDPOINT: BUSCAR PEDIDO POR ID (Obrigatório)
// URL: http://localhost:3000/order/:id
// ==========================================
app.get('/order/:id', async (req, res) => {
    try {
        // Busca o pedido usando o ID exato que foi passado na URL
        const order = await Order.findOne({ orderId: req.params.id });
        
        if (!order) {
            return res.status(404).json({ error: "Not Found", message: "Pedido não encontrado." });
        }
        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


// ==========================================
// ENDPOINT: ATUALIZAR PEDIDO (Opcional)
// URL: http://localhost:3000/order/:id
// ==========================================
app.put('/order/:id', async (req, res) => {
    try {
        const updateData = {};
        
        // Mapeia as atualizações se o usuário enviá-las no formato em português
        if (req.body.valorTotal) updateData.value = req.body.valorTotal;
        if (req.body.dataCriacao) updateData.creationDate = new Date(req.body.dataCriacao);

        if (req.body.items && Array.isArray(req.body.items)) {
            updateData.items = req.body.items.map(item => ({
                productId: Number(item.idItem),
                quantity: item.quantidadeItem,
                price: item.valorItem
            }));
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderId: req.params.id }, 
            { $set: updateData }, 
            { new: true }
        );
        
        if (!updatedOrder) {
            return res.status(404).json({ error: "Not Found", message: "Pedido não encontrado para atualização." });
        }
        return res.status(200).json({ message: "Pedido atualizado com sucesso", order: updatedOrder });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


// ==========================================
// ENDPOINT: DELETAR PEDIDO (Opcional)
// URL: http://localhost:3000/order/:id
// ==========================================
app.delete('/order/:id', async (req, res) => {
    try {
        const deletedOrder = await Order.findOneAndDelete({ orderId: req.params.id });
        
        if (!deletedOrder) {
            return res.status(404).json({ error: "Not Found", message: "Pedido não encontrado para exclusão." });
        }
        return res.status(200).json({ message: `Pedido ${req.params.id} deletado com sucesso.` });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});


// ==========================================
// INICIANDO O SERVIDOR
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 API rodando na porta ${PORT}`);
});
