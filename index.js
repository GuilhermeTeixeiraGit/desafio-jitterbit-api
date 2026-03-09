const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
const Order = require('./models/Order');

const app = express();
app.use(express.json());

// ==========================================
// CONFIGURAÇÃO SWAGGER (Documentação)
// ==========================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ==========================================
// CONFIGURAÇÃO JWT (Segurança)
// ==========================================
const SECRET_KEY = 'chave_secreta_jitterbit_teste';

// Rota aberta para gerar o token
app.post('/login', (req, res) => {
    const token = jwt.sign({ user: 'avaliador' }, SECRET_KEY, { expiresIn: '1h' });
    return res.status(200).json({ token });
});

// Middleware de bloqueio
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: "Acesso Negado", message: "Token JWT não fornecido." });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Acesso Negado", message: "Token inválido ou expirado." });
        req.user = user;
        next();
    });
};

// ==========================================
// BANCO DE DADOS
// ==========================================
mongoose.connect('mongodb://localhost:27017/jitterbit')
    .then(() => console.log('✅ Conectado ao MongoDB'))
    .catch(err => console.error('❌ Erro no MongoDB:', err));

// ==========================================
// ENDPOINTS DO CRUD (Agora protegidos pelo authenticateToken)
// ==========================================

app.post('/order', authenticateToken, async (req, res) => {
    try {
        const { numeroPedido, valorTotal, dataCriacao, items } = req.body;

        if (!numeroPedido || !valorTotal || !items || !Array.isArray(items)) {
            return res.status(400).json({ error: "Bad Request", message: "Formato inválido." });
        }

        const mappedItems = items.map(item => ({
            productId: Number(item.idItem),
            quantity: item.quantidadeItem,
            price: item.valorItem
        }));

        const newOrder = new Order({
            orderId: numeroPedido,
            value: valorTotal,
            creationDate: new Date(dataCriacao),
            items: mappedItems
        });

        const savedOrder = await newOrder.save();
        return res.status(201).json({ message: "Pedido processado com sucesso!", order: savedOrder });
    } catch (error) {
        if (error.code === 11000) return res.status(409).json({ error: "Conflict", message: "Pedido já cadastrado." });
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.get('/order/list', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find();
        return res.status(200).json(orders);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.get('/order/:id', authenticateToken, async (req, res) => {
    try {
        const order = await Order.findOne({ orderId: req.params.id });
        if (!order) return res.status(404).json({ error: "Not Found", message: "Pedido não encontrado." });
        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.put('/order/:id', authenticateToken, async (req, res) => {
    try {
        const updateData = {};
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
            { orderId: req.params.id }, { $set: updateData }, { new: true }
        );
        if (!updatedOrder) return res.status(404).json({ error: "Not Found", message: "Pedido não encontrado." });
        return res.status(200).json({ message: "Atualizado com sucesso", order: updatedOrder });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

app.delete('/order/:id', authenticateToken, async (req, res) => {
    try {
        const deletedOrder = await Order.findOneAndDelete({ orderId: req.params.id });
        if (!deletedOrder) return res.status(404).json({ error: "Not Found", message: "Pedido não encontrado." });
        return res.status(200).json({ message: `Pedido ${req.params.id} deletado com sucesso.` });
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 API rodando na porta ${PORT}`);
    console.log(`📄 Documentação: http://localhost:${PORT}/api-docs`);
});
