const express = require('express');
const { Pool } = require('pg'); // Importamos Pool para PostgreSQL
const nodemailer = require('nodemailer');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Rutas para las páginas principales (se mantienen igual)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// ******************************************************
// ** Configuración de la base de datos PostgreSQL/Supabase **
// ******************************************************
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
    console.error("FATAL: La variable de entorno DATABASE_URL no está configurada.");
    process.exit(1);
}

// Crear un pool de conexiones para PostgreSQL
const pool = new Pool({
    connectionString: DATABASE_URL,
    // Asegurarse de usar SSL, requerido por Supabase
    ssl: {
        rejectUnauthorized: false
    }
});

// Función para inicializar las tablas de forma asíncrona
async function initializeDatabase() {
    let client;
    try {
        client = await pool.connect();
        console.log('Conectado exitosamente a PostgreSQL (Supabase).');

        // Script de inicialización de tablas (adaptado a PostgreSQL)
        await client.query(`
            CREATE TABLE IF NOT EXISTS Producto (
                ID_PRODUCTO SERIAL PRIMARY KEY,
                NOMBRE_PRODUCTO VARCHAR(255) NOT NULL,
                DESCRIPCION_PRODUCTO TEXT,
                PRECIO_PRODUCTO NUMERIC(10, 2) NOT NULL,
                PRECIO_ANTERIOR NUMERIC(10, 2),
                IMAGEN_URL TEXT,
                ESTRELLAS NUMERIC(2, 1) DEFAULT 0,
                STOCK_PRODUCTO INTEGER NOT NULL DEFAULT 0,
                CATEGORIA VARCHAR(100)
            );
            CREATE TABLE IF NOT EXISTS Pedido (
                ID_PEDIDO SERIAL PRIMARY KEY,
                ID_PRODUCTO INTEGER,
                NOMBRE_SERVICIO VARCHAR(255),
                CANTIDAD_PEDIDO INTEGER NOT NULL,
                PRECIO_UNITARIO NUMERIC(10, 2) NOT NULL,
                FECHA_PEDIDO TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                NOMBRE_CLIENTE VARCHAR(255) NOT NULL,
                CORREO_CLIENTE VARCHAR(255) NOT NULL,
                TELEFONO_CLIENTE VARCHAR(50) NOT NULL,
                METODO_PAGO VARCHAR(50) NOT NULL,
                NOTAS_ADICIONALES TEXT,
                ESTADO VARCHAR(50) DEFAULT 'pendiente',
                FOREIGN KEY (ID_PRODUCTO) REFERENCES Producto (ID_PRODUCTO)
            );
        `);
        console.log('Tablas Producto y Pedido verificadas/creadas en PostgreSQL.');

        // La verificación de columna se hace en la migración, aquí solo se intenta agregar si no existe
        // NOTA: ALTER TABLE IF NOT EXISTS no está soportado universalmente, por lo que este check simple se omite.
        // Si necesitas asegurar la columna, hazlo manualmente en Supabase o con una lógica más compleja de Postgres.

    } catch (err) {
        console.error('Error al conectar o inicializar la base de datos PostgreSQL:', err.stack);
        process.exit(1); // Salir si la conexión o inicialización fallan
    } finally {
        if (client) {
            client.release(); // Liberar el cliente al pool
        }
    }
}

// Ejecutar la inicialización
initializeDatabase();

// Configuración del transporter de nodemailer (se mantiene igual)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// **********************************************
// ** Funciones de utilidad para PostgreSQL (ASÍNCRONAS) **
// **********************************************

// Función genérica para ejecutar INSERT/UPDATE/DELETE/SELECT (todas)
async function runQuery(sql, params = []) {
    try {
        // En PostgreSQL, el pool.query maneja la conexión y liberación automáticamente
        const result = await pool.query(sql, params);
        return result;
    } catch (error) {
        console.error('Error en runQuery:', error.stack);
        throw error;
    }
}

// Función genérica para obtener un único registro (SELECT)
async function getQuery(sql, params = []) {
    const result = await runQuery(sql, params);
    return result.rows[0]; // Retorna el primer resultado o undefined
}

// Función genérica para obtener múltiples registros (SELECT)
async function allQuery(sql, params = []) {
    const result = await runQuery(sql, params);
    return result.rows; // Retorna todos los resultados
}

// ================== RUTAS ESPECÍFICAS PARA EL FRONTEND (TODAS ASÍNCRONAS) ==================

// Ruta para juguetes caninos
app.get('/api/juguetes-caninos', async (req, res) => {
    try {
        const products = await allQuery(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(CATEGORIA) = 'canino'
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
        const products = await allQuery(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(CATEGORIA) = 'gatuno'
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
        const products = await allQuery(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(CATEGORIA) = 'accesorio'
            ORDER BY ID_PRODUCTO
        `);
        res.json(products);
    } catch (error) {
        console.error('Error en la API /api/accesorios:', error);
        res.status(500).json({ error: 'Error al obtener accesorios' });
    }
});

// Ruta para snacks
app.get('/api/snacks', async (req, res) => {
    try {
        const products = await allQuery(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(CATEGORIA) = 'snack'
            ORDER BY ID_PRODUCTO
        `);
        res.json(products);
    } catch (error) {
        console.error('Error en la API /api/snacks:', error);
        res.status(500).json({ error: 'Error al obtener snacks' });
    }
});

// Ruta para búsqueda de productos
app.get('/api/products/search', async (req, res) => {
    try {
        const searchTerm = req.query.q ? `%${req.query.q.toLowerCase()}%` : '';
        const products = await allQuery(`
            SELECT 
                ID_PRODUCTO as id,
                NOMBRE_PRODUCTO as nombre,
                DESCRIPCION_PRODUCTO as descripcion,
                PRECIO_PRODUCTO as precio,
                IMAGEN_URL as imagen
            FROM Producto 
            WHERE LOWER(NOMBRE_PRODUCTO) LIKE $1 OR LOWER(DESCRIPCION_PRODUCTO) LIKE $2
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
        const products = await allQuery(`
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
        const product = await getQuery(`
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
            WHERE ID_PRODUCTO = $1
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
        
        if (!name || !currentPrice || !quantity || !category) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        
        if (isNaN(currentPrice) || isNaN(quantity)) {
            return res.status(400).json({ error: 'Precio y cantidad deben ser números válidos' });
        }
        
        const result = await runQuery(
            `INSERT INTO Producto 
             (NOMBRE_PRODUCTO, DESCRIPCION_PRODUCTO, PRECIO_PRODUCTO, PRECIO_ANTERIOR, IMAGEN_URL, ESTRELLAS, STOCK_PRODUCTO, CATEGORIA) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING ID_PRODUCTO`,
            [name, description, currentPrice, oldPrice || null, image || '', stars || 0, quantity, category]
        );
        
        // PostgreSQL devuelve el ID en rows[0]
        res.status(201).json({ 
            message: 'Producto creado correctamente',
            id: result.rows[0].id_producto 
        });
    } catch (error) {
        console.error('Error en la API /api/products (POST):', error);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

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
        
        const existingProduct = await getQuery(
            "SELECT ID_PRODUCTO FROM Producto WHERE ID_PRODUCTO = $1", 
            [id]
        );
        
        if (!existingProduct) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        if (!name || !currentPrice || !quantity || !category) {
            return res.status(400).json({ error: 'Faltan campos obligatorios' });
        }
        
        if (isNaN(currentPrice) || isNaN(quantity)) {
            return res.status(400).json({ error: 'Precio y cantidad deben ser números válidos' });
        }
        
        await runQuery(
            `UPDATE Producto 
             SET NOMBRE_PRODUCTO = $1, DESCRIPCION_PRODUCTO = $2, PRECIO_PRODUCTO = $3, 
                 PRECIO_ANTERIOR = $4, IMAGEN_URL = $5, ESTRELLAS = $6, 
                 STOCK_PRODUCTO = $7, CATEGORIA = $8
             WHERE ID_PRODUCTO = $9`,
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

// Eliminar un producto
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const existingProduct = await getQuery(
            "SELECT ID_PRODUCTO FROM Producto WHERE ID_PRODUCTO = $1", 
            [id]
        );
        
        if (!existingProduct) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const orders = await allQuery(
            "SELECT ID_PEDIDO FROM Pedido WHERE ID_PRODUCTO = $1", 
            [id]
        );
        
        if (orders.length > 0) {
            return res.status(400).json({ 
                error: 'No se puede eliminar el producto porque tiene pedidos asociados' 
            });
        }
        
        await runQuery("DELETE FROM Producto WHERE ID_PRODUCTO = $1", [id]);
        
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
    
    if (!customer || !customer.name || !customer.email || !customer.phone || !items || !Array.isArray(items) || items.length === 0 || total === undefined) {
        return res.status(400).json({ error: 'Faltan datos obligatorios del pedido o del cliente.' });
    }

    let client; // Cliente de conexión para la transacción
    try {
        client = await pool.connect();
        await client.query('BEGIN'); // Iniciar la transacción

        // 1. Verificar stock para productos
        for (const item of items) {
            if (!item.isService) { 
                const productResult = await client.query("SELECT STOCK_PRODUCTO, NOMBRE_PRODUCTO FROM Producto WHERE ID_PRODUCTO = $1", [item.id]);
                const product = productResult.rows[0];

                if (!product) {
                    throw new Error(`Producto con ID ${item.id} no encontrado.`);
                }

                if (product.stock_producto < item.quantity) {
                    throw new Error(`No hay suficiente stock de ${product.nombre_producto}. Solo quedan ${product.stock_producto} unidades.`);
                }
            }
        }

        // 2. Actualizar stock y registrar pedidos
        for (const item of items) {
            if (!item.isService) {
                await client.query("UPDATE Producto SET STOCK_PRODUCTO = STOCK_PRODUCTO - $1 WHERE ID_PRODUCTO = $2", [item.quantity, item.id]);
            }
            
            await client.query(
                "INSERT INTO Pedido (ID_PRODUCTO, NOMBRE_SERVICIO, CANTIDAD_PEDIDO, PRECIO_UNITARIO, NOMBRE_CLIENTE, CORREO_CLIENTE, TELEFONO_CLIENTE, METODO_PAGO, NOTAS_ADICIONALES) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                [
                    item.isService ? null : item.id,
                    item.isService ? item.name : null,
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

        await client.query('COMMIT'); // Confirmar la transacción

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
        }

        res.json({ success: true, message: 'Pedido procesado y stock actualizado correctamente.' });

    } catch (error) {
        if (client) {
            await client.query('ROLLBACK'); // Revertir la transacción si algo falla
        }
        console.error('Error al procesar el pedido:', error);
        res.status(500).json({ success: false, message: `Error interno del servidor al procesar el pedido: ${error.message}` });
    } finally {
        if (client) {
            client.release();
        }
    }
});

// Obtener todos los pedidos
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
            query += " WHERE p.ESTADO = $1";
            params.push(status);
        }
        
        query += " ORDER BY p.FECHA_PEDIDO DESC";
        
        const orders = await allQuery(query, params);
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
        const order = await getQuery(`
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
            WHERE p.ID_PEDIDO = $1
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
        
        const existingOrder = await getQuery(
            "SELECT ID_PEDIDO FROM Pedido WHERE ID_PEDIDO = $1", 
            [id]
        );
        
        if (!existingOrder) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        await runQuery(
            `UPDATE Pedido 
             SET ID_PRODUCTO = $1, NOMBRE_SERVICIO = $2, CANTIDAD_PEDIDO = $3, 
                 PRECIO_UNITARIO = $4, NOMBRE_CLIENTE = $5, CORREO_CLIENTE = $6, 
                 TELEFONO_CLIENTE = $7, METODO_PAGO = $8, NOTAS_ADICIONALES = $9, ESTADO = $10
             WHERE ID_PEDIDO = $11`,
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

// Actualizar solo el estado de un pedido
app.put('/api/orders/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const existingOrder = await getQuery(
            "SELECT ID_PEDIDO, CORREO_CLIENTE, NOMBRE_CLIENTE FROM Pedido WHERE ID_PEDIDO = $1", 
            [id]
        );
        
        if (!existingOrder) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        const validStatuses = ['pendiente', 'pagado', 'en camino', 'entregado', 'cancelado'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Estado no válido' });
        }
        
        await runQuery(
            "UPDATE Pedido SET ESTADO = $1 WHERE ID_PEDIDO = $2",
            [status, id]
        );
        
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
                    to: existingOrder.correo_cliente, // Los nombres de columnas son minúsculas en el objeto devuelto por pg
                    subject: `Actualización de tu pedido #${id} - Patitas Contentas`,
                    html: `
                        <h2>Hola ${existingOrder.nombre_cliente},</h2>
                        <p>El estado de tu pedido #${id} ${statusMessages[status]}</p>
                        <br>
                        <p>¡Gracias por confiar en Patitas Contentas!</p>
                    `
                };
                
                await transporter.sendMail(mailOptions);
                console.log('Correo de actualización de estado enviado a:', existingOrder.correo_cliente);
            } catch (emailError) {
                console.error('Error al enviar correo de actualización:', emailError);
            }
        }
        
        res.json({ message: 'Estado del pedido actualizado correctamente' });
    } catch (error) {
        console.error('Error en la API /api/orders/:id/status:', error);
        res.status(500).json({ error: 'Error al actualizar estado del pedido' });
    }
});

// Eliminar un pedido
app.delete('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const existingOrder = await getQuery(
            "SELECT ID_PEDIDO FROM Pedido WHERE ID_PEDIDO = $1", 
            [id]
        );
        
        if (!existingOrder) {
            return res.status(404).json({ error: 'Pedido no encontrado' });
        }
        
        await runQuery("DELETE FROM Pedido WHERE ID_PEDIDO = $1", [id]);
        
        res.json({ message: 'Pedido eliminado correctamente' });
    } catch (error) {
        console.error('Error en la API /api/orders/:id (DELETE):', error);
        res.status(500).json({ error: 'Error al eliminar pedido' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});

app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Servidor funcionando correctamente' });
});