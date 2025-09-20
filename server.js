const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');
const path = require('path');
const cors = require('cors'); // Añadir CORS
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors()); // Habilitar CORS para todas las rutas
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Corregir ruta estática

// Agrega estas rutas para las páginas principales
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Configuración de la base de datos
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) {
        console.error('Error al conectar con la base de datos:', err.message);
    } else {
        console.log('Conectado a la base de datos SQLite.');
        
        // Crear tablas si no existen
        db.run(`CREATE TABLE IF NOT EXISTS Producto (
            ID_PRODUCTO INTEGER PRIMARY KEY AUTOINCREMENT,
            NOMBRE_PRODUCTO TEXT NOT NULL,
            DESCRIPCION_PRODUCTO TEXT,
            PRECIO_PRODUCTO REAL NOT NULL,
            PRECIO_ANTERIOR REAL,
            IMAGEN_URL TEXT,
            ESTRELLAS REAL DEFAULT 0,
            STOCK_PRODUCTO INTEGER NOT NULL DEFAULT 0,
            CATEGORIA TEXT
        )`, (err) => {
            if (err) {
                console.error('Error al crear la tabla Producto:', err.message);
            } else {
                console.log('Tabla Producto verificada/creada.');
            }
        });
        
        // Actualizar la estructura de la tabla Pedido para incluir NOMBRE_SERVICIO
        db.run(`CREATE TABLE IF NOT EXISTS Pedido (
            ID_PEDIDO INTEGER PRIMARY KEY AUTOINCREMENT,
            ID_PRODUCTO INTEGER, -- Puede ser NULL si es un servicio sin ID de producto
            NOMBRE_SERVICIO TEXT, -- Para servicios que no tienen ID de producto (NUEVA COLUMNA)
            CANTIDAD_PEDIDO INTEGER NOT NULL,
            PRECIO_UNITARIO REAL NOT NULL, -- Guardar el precio unitario al momento del pedido
            FECHA_PEDIDO DATETIME DEFAULT CURRENT_TIMESTAMP,
            NOMBRE_CLIENTE TEXT NOT NULL,
            CORREO_CLIENTE TEXT NOT NULL,
            TELEFONO_CLIENTE TEXT NOT NULL,
            METODO_PAGO TEXT NOT NULL,
            NOTAS_ADICIONALES TEXT,
            ESTADO TEXT DEFAULT 'pendiente',
            FOREIGN KEY (ID_PRODUCTO) REFERENCES Producto (ID_PRODUCTO)
        )`, (err) => {
            if (err) {
                console.error('Error al crear la tabla Pedido:', err.message);
            } else {
                console.log('Tabla Pedido verificada/creada.');
                
                // Verificar si la columna NOMBRE_SERVICIO existe, si no, agregarla
                db.all("PRAGMA table_info(Pedido)", (err, columns) => {
                    if (err) {
                        console.error('Error al verificar la estructura de la tabla Pedido:', err);
                        return;
                    }
                    
                    const hasServiceName = columns.some(col => col.name === 'NOMBRE_SERVICIO');
                    if (!hasServiceName) {
                        console.log('Agregando columna NOMBRE_SERVICIO a la tabla Pedido...');
                        db.run("ALTER TABLE Pedido ADD COLUMN NOMBRE_SERVICIO TEXT", (err) => {
                            if (err) {
                                console.error('Error al agregar columna NOMBRE_SERVICIO:', err);
                            } else {
                                console.log('Columna NOMBRE_SERVICIO agregada correctamente.');
                            }
                        });
                    }
                });
            }
        });
    }
});

// Configuración del transporter de nodemailer
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// ================== NUEVAS RUTAS ESPECÍFICAS PARA EL FRONTEND ==================

// Ruta para juguetes caninos
app.get('/api/juguetes-caninos', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(CATEGORIA) = 'canino' -- Convertir a minúsculas para una comparación robusta
            ORDER BY ID_PRODUCTO
        `);
        res.json(products);
    } catch (error) {
        console.error('Error en la API /api/juguetes-caninos:', error);
        res.status(500).json({ error: 'Error al obtener juguetes caninos' });
    }
});

// Ruta para juguetes gatunos
app.get('/api/juguetes-gatunos', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(CATEGORIA) = 'gatuno' -- Convertir a minúsculas para una comparación robusta
            ORDER BY ID_PRODUCTO
        `);
        res.json(products);
    } catch (error) {
        console.error('Error en la API /api/juguetes-gatunos:', error);
        res.status(500).json({ error: 'Error al obtener juguetes gatunos' });
    }
});

// Ruta para accesorios
app.get('/api/accesorios', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(CATEGORIA) = 'accesorio' -- Convertir a minúsculas para una comparación robusta
            ORDER BY ID_PRODUCTO
        `);
        res.json(products);
    } catch (error) {
        console.error('Error en la API /api/accesorios:', error);
        res.status(500).json({ error: 'Error al obtener accesorios' });
    }
});

// Ruta para búsqueda de productos
app.get('/api/products/search', async (req, res) => {
    try {
        const searchTerm = req.query.q ? `%${req.query.q.toLowerCase()}%` : '';
        const products = await dbAll(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(NOMBRE_PRODUCTO) LIKE ? OR LOWER(DESCRIPCION_PRODUCTO) LIKE ?
            ORDER BY ID_PRODUCTO
        `, [searchTerm, searchTerm]);
        res.json(products);
    } catch (error) {
        console.error('Error en la API /api/products/search:', error);
        res.status(500).json({ error: 'Error al buscar productos' });
    }
});

// ================== RUTAS PARA LA API DE PRODUCTOS ==================

// Obtener todos los productos
app.get('/api/products', async (req, res) => {
    try {
        const products = await dbAll(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as name,
                DESCRIPCION_PRODUCTO as description,
                PRECIO_PRODUCTO as currentPrice,
                PRECIO_ANTERIOR as oldPrice,
                IMAGEN_URL as image,
                ESTRELLAS as stars,
                STOCK_PRODUCTO as quantity,
                CATEGORIA as category
            FROM Producto 
            ORDER BY ID_PRODUCTO
        `);
        res.json(products);
    } catch (error) {
        console.error('Error en la API /api/products:', error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

// Obtener un producto por ID
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const product = await dbGet(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as name,
                DESCRIPCION_PRODUCTO as description,
                PRECIO_PRODUCTO as currentPrice,
                PRECIO_ANTERIOR as oldPrice,
                IMAGEN_URL as image,
                ESTRELLAS as stars,
                STOCK_PRODUCTO as quantity,
                CATEGORIA as category
            FROM Producto 
            WHERE ID_PRODUCTO = ?
        `, [id]);
        
        if (!product) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        res.json(product);
    } catch (error) {
        console.error('Error en la API /api/products/:id:', error);
        res.status(500).json({ error: 'Error al obtener producto' });
    }
});

// Crear un nuevo producto
app.post('/api/products', async (req, res) => {
    try {
        const { 
            name, 
            description, 
            currentPrice, 
            oldPrice, 
            image, 
            stars, 
            quantity, 
            category 
        } = req.body;
        
        // Validar datos requeridos
        if (!name || !currentPrice || !quantity || !category) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        
        // Validar tipos de datos
        if (isNaN(currentPrice) || isNaN(quantity)) {
            return res.status(400).json({ error: 'Precio y cantidad deben ser números válidos' });
        }
        
        const result = await dbRun(
            `INSERT INTO Producto 
             (NOMBRE_PRODUCTO, DESCRIPCION_PRODUCTO, PRECIO_PRODUCTO, PRECIO_ANTERIOR, IMAGEN_URL, ESTRELLAS, STOCK_PRODUCTO, CATEGORIA) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [name, description, currentPrice, oldPrice || null, image || '', stars || 0, quantity, category]
        );
        
        res.status(201).json({ 
            message: 'Producto creado correctamente',
            id: result.lastID 
        });
    } catch (error) {
        console.error('Error en la API /api/products (POST):', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// ================== RUTAS PARA LA API DE PRODUCTOS ==================

// Actualizar un producto
app.put('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            name, 
            description, 
            currentPrice, 
            oldPrice, 
            image, 
            stars, 
            quantity, 
            category 
        } = req.body;
        
        // Verificar que el producto existe
        const existingProduct = await dbGet(
            "SELECT ID_PRODUCTO FROM Producto WHERE ID_PRODUCTO = ?", 
            [id]
        );
        
        if (!existingProduct) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Validar datos requeridos
        if (!name || !currentPrice || !quantity || !category) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        
        // Validar tipos de datos
        if (isNaN(currentPrice) || isNaN(quantity)) {
            return res.status(400).json({ error: 'Precio y cantidad deben ser números válidos' });
        }
        
        // Actualizar el producto
        await dbRun(
            `UPDATE Producto 
             SET NOMBRE_PRODUCTO = ?, DESCRIPCION_PRODUCTO = ?, PRECIO_PRODUCTO = ?, 
                 PRECIO_ANTERIOR = ?, IMAGEN_URL = ?, ESTRELLAS = ?, 
                 STOCK_PRODUCTO = ?, CATEGORIA = ?
             WHERE ID_PRODUCTO = ?`,
            [
                name, 
                description, 
                currentPrice, 
                oldPrice || null, 
                image || '', 
                stars || 0, 
                quantity, 
                category,
                id
            ]
        );
        
        res.json({ message: 'Producto actualizado correctamente' });
    } catch (error) {
        console.error('Error en la API /api/products/:id (PUT):', error);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});


// Actualizar un pedido (incluyendo todos los campos)
app.put('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            customerName, 
            customerEmail, 
            customerPhone, 
            quantity, 
            notes 
        } = req.body;
        
        // Verificar que el pedido existe
        const existingOrder = await dbGet(
            "SELECT ID_PEDIDO, PRECIO_UNITARIO, METODO_PAGO, ESTADO FROM Pedido WHERE ID_PEDIDO = ?", 
            [id]
        );
        
        if (!existingOrder) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        // Validar datos requeridos
        if (!customerName || !customerEmail || !customerPhone || !quantity) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        
        // Validar tipos de datos
        if (isNaN(quantity) || quantity < 1) {
            return res.status(400).json({ error: 'Cantidad debe ser un número válido mayor a 0' });
        }
        
        // Actualizar el pedido - solo los campos que se pueden modificar
        await dbRun(
            `UPDATE Pedido 
             SET NOMBRE_CLIENTE = ?, CORREO_CLIENTE = ?, 
                 TELEFONO_CLIENTE = ?, CANTIDAD_PEDIDO = ?, NOTAS_ADICIONALES = ?
             WHERE ID_PEDIDO = ?`,
            [
                customerName, 
                customerEmail, 
                customerPhone, 
                quantity, 
                notes || '',
                id
            ]
        );
        
        res.json({ message: 'Pedido actualizado correctamente' });
    } catch (error) {
        console.error('Error en la API /api/orders/:id (PUT):', error);
        res.status(500).json({ error: 'Error al actualizar pedido' });
    }
});

// Eliminar un producto
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el producto existe
        const existingProduct = await dbGet(
            "SELECT ID_PRODUCTO FROM Producto WHERE ID_PRODUCTO = ?", 
            [id]
        );
        
        if (!existingProduct) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        // Verificar si el producto tiene pedidos asociados
        const orders = await dbAll(
            "SELECT ID_PEDIDO FROM Pedido WHERE ID_PRODUCTO = ?", 
            [id]
        );
        
        if (orders.length > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar el producto porque tiene pedidos asociados' 
            });
        }
        
        await dbRun("DELETE FROM Producto WHERE ID_PRODUCTO = ?", [id]);
        
        res.json({ message: 'Producto eliminado correctamente' });
    } catch (error) {
        console.error('Error en la API /api/products/:id (DELETE):', error);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

// ================== RUTAS PARA LA API DE PEDIDOS ==================

// Ruta para procesar pedidos y actualizar inventario
app.post('/api/process-order', async (req, res) => {
    const { customer, items, total, notes } = req.body;

    // Validaciones básicas de los datos recibidos
    if (!customer || !customer.name || !customer.email || !customer.phone || !items || !Array.isArray(items) || items.length === 0 || total === undefined) {
        return res.status(400).json({ error: 'Faltan datos obligatorios del pedido o del cliente.' });
    }

    try {
        // Iniciar transacción
        await new Promise((resolve, reject) => {
            db.run("BEGIN TRANSACTION", function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        // 1. Verificar stock para productos (los servicios no tienen stock en la tabla Producto)
        const stockUpdates = [];
        for (const item of items) {
            if (!item.isService) { // Solo verificar stock para productos
                const product = await dbGet("SELECT STOCK_PRODUCTO, NOMBRE_PRODUCTO FROM Producto WHERE ID_PRODUCTO = ?", [item.id]);

                if (!product) {
                    await new Promise((resolve, reject) => { db.run("ROLLBACK", function(err) { if (err) reject(err); else resolve(); }); });
                    return res.status(404).json({ success: false, message: `Producto con ID ${item.id} no encontrado.` });
                }

                if (product.STOCK_PRODUCTO < item.quantity) {
                    await new Promise((resolve, reject) => { db.run("ROLLBACK", function(err) { if (err) reject(err); else resolve(); }); });
                    return res.status(400).json({ success: false, message: `No hay suficiente stock de ${product.NOMBRE_PRODUCTO}. Solo quedan ${product.STOCK_PRODUCTO} unidades.` });
                }
                stockUpdates.push({ productId: item.id, quantity: item.quantity });
            }
        }

        // 2. Actualizar stock y registrar pedidos
        for (const update of stockUpdates) {
            await dbRun("UPDATE Producto SET STOCK_PRODUCTO = STOCK_PRODUCTO - ? WHERE ID_PRODUCTO = ?", [update.quantity, update.productId]);
        }

        for (const item of items) {
            await dbRun(
                "INSERT INTO Pedido (ID_PRODUCTO, NOMBRE_SERVICIO, CANTIDAD_PEDIDO, PRECIO_UNITARIO, NOMBRE_CLIENTE, CORREO_CLIENTE, TELEFONO_CLIENTE, METODO_PAGO, NOTAS_ADICIONALES) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [
                    item.isService ? null : item.id, // ID_PRODUCTO (null para servicios)
                    item.isService ? item.name : null, // NOMBRE_SERVICIO (para servicios)
                    item.quantity,
                    item.price,
                    customer.name,
                    customer.email,
                    customer.phone,
                    customer.paymentMethod,
                    notes || ''
                ]
            );
        }

        // Confirmar transacción
        await new Promise((resolve, reject) => {
            db.run("COMMIT", function(err) {
                if (err) reject(err);
                else resolve();
            });
        });

        // Enviar correo de confirmación
        try {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: customer.email,
                subject: 'Confirmación de Pedido - Patitas Contentas',
                html: `
                    <h2>¡Gracias por tu pedido, ${customer.name}!</h2>
                    <p>Tu pedido ha sido procesado exitosamente.</p>
                    <h3>Resumen del pedido:</h3>
                    <ul>
                        ${items.map(item => `<li>${item.name} - ${item.quantity} x $${item.price.toFixed(2)}</li>`).join('')}
                    </ul>
                    <p><strong>Total: $${total.toFixed(2)}</strong></p>
                    <p>Método de pago: ${customer.paymentMethod}</p>
                    ${notes ? `<p>Notas adicionales: ${notes}</p>` : ''}
                    <br>
                    <p>Te contactaremos pronto para coordinar la entrega.</p>
                    <p>¡Gracias por confiar en Patitas Contentas!</p>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log('Correo de confirmación enviado a:', customer.email);
        } catch (emailError) {
            console.error('Error al enviar correo de confirmación:', emailError);
            // No falla el pedido si hay error en el correo, solo se registra
        }

        res.json({ success: true, message: 'Pedido procesado y stock actualizado correctamente.' });

    } catch (error) {
        // Revertir transacción en caso de error
        await new Promise((resolve, reject) => { db.run("ROLLBACK", function(err) { if (err) reject(err); else resolve(); }); });
        console.error('Error al procesar el pedido:', error);
        res.status(500).json({ success: false, message: 'Error interno del servidor al procesar el pedido.' });
    }
});

// Obtener todos los pedidos
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await dbAll(`
            SELECT 
                p.ID_PEDIDO as id,
                p.ID_PRODUCTO as productId,
                p.NOMBRE_SERVICIO as serviceName,
                p.CANTIDAD_PEDIDO as quantity,
                p.PRECIO_UNITARIO as unitPrice,
                p.FECHA_PEDIDO as date,
                p.NOMBRE_CLIENTE as customerName,
                p.CORREO_CLIENTE as customerEmail,
                p.TELEFONO_CLIENTE as customerPhone,
                p.METODO_PAGO as paymentMethod,
                p.NOTAS_ADICIONALES as notes,
                p.ESTADO as status,
                prod.NOMBRE_PRODUCTO as productName,
                prod.IMAGEN_URL as productImage
            FROM Pedido p
            LEFT JOIN Producto prod ON p.ID_PRODUCTO = prod.ID_PRODUCTO
            ORDER BY p.FECHA_PEDIDO DESC
        `);
        res.json(orders);
    } catch (error) {
        console.error('Error en la API /api/orders:', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

// Obtener un pedido por ID
app.get('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const order = await dbGet(`
            SELECT 
                p.ID_PEDIDO as id,
                p.ID_PRODUCTO as productId,
                p.NOMBRE_SERVICIO as serviceName,
                p.CANTIDAD_PEDIDO as quantity,
                p.PRECIO_UNITARIO as unitPrice,
                p.FECHA_PEDIDO as date,
                p.NOMBRE_CLIENTE as customerName,
                p.CORREO_CLIENTE as customerEmail,
                p.TELEFONO_CLIENTE as customerPhone,
                p.METODO_PAGO as paymentMethod,
                p.NOTAS_ADICIONALES as notes,
                p.ESTADO as status,
                prod.NOMBRE_PRODUCTO as productName,
                prod.IMAGEN_URL as productImage
            FROM Pedido p
            LEFT JOIN Producto prod ON p.ID_PRODUCTO = prod.ID_PRODUCTO
            WHERE p.ID_PEDIDO = ?
        `, [id]);
        
        if (!order) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        res.json(order);
    } catch (error) {
        console.error('Error en la API /api/orders/:id:', error);
        res.status(500).json({ error: 'Error al obtener pedido' });
    }
});

// ===== RUTA CORREGIDA PARA ACTUALIZAR PEDIDOS =====
// Actualizar un pedido (incluyendo todos los campos)
app.put('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            productId, 
            serviceName, 
            quantity, 
            unitPrice, 
            customerName, 
            customerEmail, 
            customerPhone, 
            paymentMethod, 
            notes, 
            status 
        } = req.body;
        
        // Verificar que el pedido existe
        const existingOrder = await dbGet(
            "SELECT ID_PEDIDO FROM Pedido WHERE ID_PEDIDO = ?", 
            [id]
        );
        
        if (!existingOrder) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        // Actualizar el pedido
        await dbRun(
            `UPDATE Pedido 
             SET ID_PRODUCTO = ?, NOMBRE_SERVICIO = ?, CANTIDAD_PEDIDO = ?, 
                 PRECIO_UNITARIO = ?, NOMBRE_CLIENTE = ?, CORREO_CLIENTE = ?, 
                 TELEFONO_CLIENTE = ?, METODO_PAGO = ?, NOTAS_ADICIONALES = ?, ESTADO = ?
             WHERE ID_PEDIDO = ?`,
            [
                productId, 
                serviceName, 
                quantity, 
                unitPrice, 
                customerName, 
                customerEmail, 
                customerPhone, 
                paymentMethod, 
                notes, 
                status,
                id
            ]
        );
        
        res.json({ message: 'Pedido actualizado correctamente' });
    } catch (error) {
        console.error('Error en la API /api/orders/:id (PUT):', error);
        res.status(500).json({ error: 'Error al actualizar pedido' });
    }
});
// ===== FIN DE RUTA CORREGIDA =====

// Actualizar solo el estado de un pedido
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        // Verificar que el pedido existe
        const existingOrder = await dbGet(
            "SELECT ID_PEDIDO, CORREO_CLIENTE, NOMBRE_CLIENTE FROM Pedido WHERE ID_PEDIDO = ?", 
            [id]
        );
        
        if (!existingOrder) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        // Validar el estado
        const validStatuses = ['pendiente', 'pagado', 'en camino', 'entregado', 'cancelado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }
        
        // Actualizar el estado
        await dbRun(
            "UPDATE Pedido SET ESTADO = ? WHERE ID_PEDIDO = ?",
            [status, id]
        );
        
        // Enviar correo de notificación si el estado cambia
        if (status !== 'pendiente') {
            try {
                const statusMessages = {
                    'pagado': 'ha sido pagado y está siendo preparado para su envío.',
                    'en camino': 'está en camino a su destino.',
                    'entregado': 'ha sido entregado exitosamente.',
                    'cancelado': 'ha sido cancelado. Si tienes dudas, por favor contáctanos.'
                };
                
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: existingOrder.CORREO_CLIENTE,
                    subject: `Actualización de tu pedido #${id} - Patitas Contentas`,
                    html: `
                        <h2>Hola ${existingOrder.NOMBRE_CLIENTE},</h2>
                        <p>El estado de tu pedido #${id} ${statusMessages[status]}</p>
                        <br>
                        <p>¡Gracias por confiar en Patitas Contentas!</p>
                    `
                };
                
                await transporter.sendMail(mailOptions);
                console.log('Correo de actualización de estado enviado a:', existingOrder.CORREO_CLIENTE);
            } catch (emailError) {
                console.error('Error al enviar correo de actualización:', emailError);
                // No falla la actualización si hay error en el correo
            }
        }
        
        res.json({ message: 'Estado del pedido actualizado correctamente' });
    } catch (error) {
        console.error('Error en la API /api/orders/:id/status:', error);
        res.status(500).json({ error: 'Error al actualizar estado del pedido' });
    }
});

// Obtener todos los pedidos con filtrado
app.get('/api/orders', async (req, res) => {
    try {
        const { status } = req.query;
        let query = `
            SELECT 
                p.ID_PEDIDO as id,
                p.ID_PRODUCTO as productId,
                p.NOMBRE_SERVICIO as serviceName,
                p.CANTIDAD_PEDIDO as quantity,
                p.PRECIO_UNITARIO as unitPrice,
                p.FECHA_PEDIDO as date,
                p.NOMBRE_CLIENTE as customerName,
                p.CORREO_CLIENTE as customerEmail,
                p.TELEFONO_CLIENTE as customerPhone,
                p.METODO_PAGO as paymentMethod,
                p.NOTAS_ADICIONALES as notes,
                p.ESTADO as status,
                prod.NOMBRE_PRODUCTO as productName,
                prod.IMAGEN_URL as productImage
            FROM Pedido p
            LEFT JOIN Producto prod ON p.ID_PRODUCTO = prod.ID_PRODUCTO
        `;
        
        let params = [];
        
        if (status && status !== 'all') {
            query += " WHERE p.ESTADO = ?";
            params.push(status);
        }
        
        query += " ORDER BY p.FECHA_PEDIDO DESC";
        
        const orders = await dbAll(query, params);
        res.json(orders);
    } catch (error) {
        console.error('Error en la API /api/orders:', error);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

// ... resto del código ...

// Eliminar un pedido
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verificar que el pedido existe
        const existingOrder = await dbGet(
            "SELECT ID_PEDIDO FROM Pedido WHERE ID_PEDIDO = ?", 
            [id]
        );
        
        if (!existingOrder) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        await dbRun("DELETE FROM Pedido WHERE ID_PEDIDO = ?", [id]);
        
        res.json({ message: 'Pedido eliminado correctamente' });
    } catch (error) {
        console.error('Error en la API /api/orders/:id (DELETE):', error);
        res.status(500).json({ error: 'Error al eliminar pedido' });
    }
});

// ================== FUNCIONES AUXILIARES PARA LA BASE DE DATOS ==================

// Promisified db.all
function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Promisified db.get
function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// Promisified db.run
function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ lastID: this.lastID, changes: this.changes });
            }
        });
    });
}

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});