document.addEventListener('DOMContentLoaded', () => {
    // Definición de variables del DOM (se mantienen igual)
    const productFormContainer = document.getElementById('productFormContainer');
    const productForm = document.getElementById('productForm');
    const formTitle = document.getElementById('formTitle');
    const productIdInput = document.getElementById('productId');
    const productNameInput = document.getElementById('productName');
    const productDescriptionInput = document.getElementById('productDescription');
    const productOldPriceInput = document.getElementById('productOldPrice');
    const productCurrentPriceInput = document.getElementById('productCurrentPrice');
    const productImageInput = document.getElementById('productImage');
    const productStarsInput = document.getElementById('productStars');
    const productQuantityInput = document.getElementById('productQuantity');
    const productCategoryInput = document.getElementById('productCategory');
    const saveProductBtn = document.getElementById('saveProductBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const showAddProductFormBtn = document.getElementById('showAddProductFormBtn');
    const adminProductList = document.getElementById('adminProductList');

    // Variables para gestión de pedidos
    const orderStatusFilter = document.getElementById('orderStatusFilter');
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    const ordersContainer = document.getElementById('ordersContainer');
    const orderFilterForm = document.getElementById('orderFilterForm'); // Asegúrate de que este ID existe en admin.html
    const ordersMessage = document.getElementById('ordersMessage');

    // Inicialización de pestañas (tab switching logic - se mantiene igual)
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

            e.target.classList.add('active');
            const targetId = e.target.dataset.target;
            document.getElementById(targetId).classList.add('active');

            // Cargar pedidos si se activa la pestaña de pedidos
            if (targetId === 'orders-tab') {
                loadOrders();
            }
        });
    });

    // Event Listeners (se mantienen igual)
    showAddProductFormBtn.addEventListener('click', () => showProductForm('add'));
    cancelEditBtn.addEventListener('click', () => hideProductForm());
    productForm.addEventListener('submit', handleProductFormSubmit);
    orderFilterForm.addEventListener('submit', (e) => { // Usamos el formulario para aplicar el filtro
        e.preventDefault();
        loadOrders(orderStatusFilter.value);
    });

    // ====================================================================
    // 🛑 Funciones de Utilidad (Añadidas/Modificadas para consistencia) 🛑
    // ====================================================================

    // Función genérica para manejar fetch y errores JSON
    async function apiFetch(url, options = {}) {
        try {
            const response = await fetch(url, options);
            const contentType = response.headers.get('content-type');
            
            // Intentar leer JSON solo si el Content-Type es JSON
            let data = {};
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Si no es JSON, intentar leer como texto para un error más descriptivo
                const text = await response.text();
                // Si la respuesta no fue exitosa y no es JSON, tirar error con el texto de la respuesta
                if (!response.ok) {
                    throw new Error(`Respuesta del servidor no válida (HTTP ${response.status}): ${text.substring(0, 100)}...`);
                }
                // Si fue exitosa pero no JSON, puede ser un 204 No Content
                return { message: 'Operación exitosa sin contenido de respuesta.' }; 
            }

            if (!response.ok) {
                // El servidor respondió con un código 4xx/5xx, el mensaje de error está en el JSON
                throw new Error(data.error || data.message || `Error en el servidor: HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Fetch Error:', error);
            // Re-lanzar el error para ser capturado por la función llamante
            throw new Error(error.message || 'Error de conexión con el servidor.');
        }
    }
    
    // Función para mostrar mensajes de notificación
    function showNotification(message, type = 'info') {
        // Eliminar notificación existente si hay una
        const existingNotification = document.getElementById('admin-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.id = 'admin-notification';
        notification.textContent = message;
        
        notification.style.position = 'fixed';
        notification.style.bottom = '20px';
        notification.style.right = '20px';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '4px';
        notification.style.color = 'white';
        notification.style.zIndex = '10000';
        notification.style.maxWidth = '300px';
        notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        notification.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(100%)';
        
        switch(type) {
            case 'success':
                notification.style.background = '#4CAF50';
                break;
            case 'error':
                notification.style.background = '#f44336';
                break;
            default:
                notification.style.background = '#333';
        }
        
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10); 

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateY(100%)';
                notification.addEventListener('transitionend', () => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, { once: true });
            }
        }, 5000);
    }

    // ====================================================================
    // 🛒 Gestión de Productos
    // ====================================================================

    // Cargar productos
    async function loadProducts() {
        try {
            const products = await apiFetch('/api/products');
            displayProducts(products);
        } catch (error) {
            showNotification(error.message, 'error');
            adminProductList.innerHTML = `<tr><td colspan="9" style="text-align: center;">Error al cargar productos: ${error.message}</td></tr>`;
        }
    }

    // Mostrar productos
    function displayProducts(products) {
        if (products.length === 0) {
            adminProductList.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay productos registrados.</td></tr>';
            return;
        }

        adminProductList.innerHTML = products.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>${product.name}</td>
                <td>${product.description || '-'}</td>
                <td>$${parseFloat(product.currentPrice).toFixed(2)}</td>
                <td>$${product.oldPrice ? parseFloat(product.oldPrice).toFixed(2) : '-'}</td>
                <td>${product.quantity}</td>
                <td>${product.stars || 0}</td>
                <td>${product.category}</td>
                <td>
                    <button class="btn-edit" data-id="${product.id}" 
                            data-name="${product.name}" 
                            data-desc="${product.description || ''}" 
                            data-price="${product.currentPrice}" 
                            data-oldprice="${product.oldPrice || ''}"
                            data-image="${product.image || ''}"
                            data-stars="${product.stars || 0}"
                            data-quantity="${product.quantity}"
                            data-category="${product.category}">
                        <i class="fa-solid fa-edit"></i>
                    </button>
                    <button class="btn-delete" data-id="${product.id}">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Re-adjuntar Event Listeners después de renderizar
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.currentTarget.dataset.id;
                if (confirm(`¿Estás seguro de eliminar el producto ID ${productId}? Esta acción no se puede deshacer.`)) {
                    deleteProduct(productId);
                }
            });
        });
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const data = e.currentTarget.dataset;
                editProduct(data);
            });
        });
    }

    // Mostrar formulario de producto
    function showProductForm(mode, productData = {}) {
        productFormContainer.style.display = 'block';
        if (mode === 'add') {
            formTitle.textContent = 'Agregar Nuevo Producto';
            productIdInput.value = '';
            productForm.reset();
        } else if (mode === 'edit') {
            formTitle.textContent = 'Modificar Producto';
            productIdInput.value = productData.id;
            productNameInput.value = productData.name;
            productDescriptionInput.value = productData.desc;
            productOldPriceInput.value = productData.oldprice;
            productCurrentPriceInput.value = productData.price;
            productImageInput.value = productData.image;
            productStarsInput.value = productData.stars;
            productQuantityInput.value = productData.quantity;
            productCategoryInput.value = productData.category;
        }
    }

    // Ocultar formulario de producto
    function hideProductForm() {
        productFormContainer.style.display = 'none';
        productForm.reset();
    }

    // Manejar envío del formulario de producto
    async function handleProductFormSubmit(e) {
        e.preventDefault();

        const id = productIdInput.value;
        const url = id ? `/api/products/${id}` : '/api/products';
        const method = id ? 'PUT' : 'POST';
        
        // Obtener datos del formulario
        const productData = {
            name: productNameInput.value,
            description: productDescriptionInput.value,
            oldPrice: productOldPriceInput.value ? parseFloat(productOldPriceInput.value) : null,
            currentPrice: parseFloat(productCurrentPriceInput.value),
            image: productImageInput.value,
            stars: parseInt(productStarsInput.value) || 0,
            quantity: parseInt(productQuantityInput.value),
            category: productCategoryInput.value
        };

        try {
            const message = id ? 'Producto actualizado' : 'Producto creado';
            await apiFetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });

            showNotification(`${message} correctamente.`, 'success');
            hideProductForm();
            loadProducts(); // Recargar la lista después de la operación
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // Editar producto (carga datos al formulario)
    function editProduct(productData) {
        showProductForm('edit', productData);
    }

    // Eliminar producto
    async function deleteProduct(id) {
        try {
            await apiFetch(`/api/products/${id}`, { method: 'DELETE' });
            showNotification('Producto eliminado correctamente.', 'success');
            loadProducts(); // Recargar la lista después de la eliminación
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // ====================================================================
    // 🚚 Gestión de Pedidos
    // ====================================================================

    // Cargar pedidos
    async function loadOrders(status = 'all') {
        try {
            const url = status && status !== 'all' ? `/api/orders?status=${status}` : '/api/orders';
            const orders = await apiFetch(url);
            displayOrders(orders);
        } catch (error) {
            showNotification(error.message, 'error');
            ordersContainer.innerHTML = `<tr><td colspan="10" style="text-align: center;">Error al cargar pedidos: ${error.message}</td></tr>`;
        }
    }

    // Mostrar pedidos
    function displayOrders(orders) {
        if (ordersMessage) ordersMessage.style.display = 'none';

        if (orders.length === 0) {
            if (ordersMessage) {
                ordersMessage.textContent = 'No hay pedidos con este filtro.';
                ordersMessage.style.display = 'block';
            }
            ordersContainer.innerHTML = '';
            return;
        }

        ordersContainer.innerHTML = orders.map(order => {
            const isService = order.serviceName;
            const itemDescription = isService 
                ? order.serviceName 
                : order.productName || `ID Producto: ${order.productId}`;
            const image = isService ? 'https://via.placeholder.com/50x50?text=Servicio' : order.productImage;
            const rowClass = order.status === 'cancelado' ? 'canceled-order' : '';
            
            return `
                <tr class="${rowClass}">
                    <td>${order.id}</td>
                    <td>${itemDescription}</td>
                    <td>${order.quantity}</td>
                    <td>$${(parseFloat(order.unitPrice) * order.quantity).toFixed(2)}</td>
                    <td>${new Date(order.date).toLocaleString()}</td>
                    <td>${order.customerName}</td>
                    <td>${order.customerEmail}</td>
                    <td>
                        <select class="status-select" data-id="${order.id}">
                            ${['pendiente', 'pagado', 'en camino', 'entregado', 'cancelado'].map(s => `
                                <option value="${s}" ${order.status === s ? 'selected' : ''}>${s.charAt(0).toUpperCase() + s.slice(1)}</option>
                            `).join('')}
                        </select>
                    </td>
                    <td>
                        <button class="btn-delete-order" data-id="${order.id}"><i class="fa-solid fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        // Re-adjuntar Event Listeners después de renderizar
        attachOrderEventListeners();
    }

    // Adjuntar Event Listeners para pedidos
    function attachOrderEventListeners() {
        // Actualizar estado
        document.querySelectorAll('.status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
                const orderId = e.target.dataset.id;
                const newStatus = e.target.value;
                await updateOrderStatus(orderId, newStatus);
            });
        });

        // Eliminar pedido
        document.querySelectorAll('.btn-delete-order').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.currentTarget.dataset.id;
                if (confirm('¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.')) {
                    await deleteOrder(orderId);
                }
            });
        });
    }

    // Actualizar estado del pedido
    async function updateOrderStatus(id, status) {
        try {
            await apiFetch(`/api/orders/${id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: status })
            });
            showNotification(`Estado del pedido #${id} actualizado a "${status}"`, 'success');
            
            // Recargar para actualizar la tabla (e.g., para marcar como cancelado)
            loadOrders(orderStatusFilter.value); 
        } catch (error) {
            showNotification(error.message, 'error');
            loadOrders(orderStatusFilter.value); // Recargar para revertir el selector
        }
    }

    // Eliminar pedido
    async function deleteOrder(id) {
        try {
            await apiFetch(`/api/orders/${id}`, { method: 'DELETE' });
            showNotification(`Pedido #${id} eliminado correctamente.`, 'success');
            loadOrders(orderStatusFilter.value); // Recargar la lista
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // ====================================================================
    // 🔒 Control de Acceso
    // ====================================================================

    // NOTA: Se ha movido el checkAdminAccess al inicio, antes de DOMContentLoaded
    // para un bloqueo más rápido. Aquí se mantiene la estructura interna.
    const ADMIN_PASSWORD = "Julianny12345"; // 🛑 ¡CAMBIA ESTA CONTRASEÑA EN PRODUCCIÓN! 🛑

    function checkAdminAccess() {
        const password = prompt("Ingrese la contraseña de administrador:");
        if (password !== ADMIN_PASSWORD) {
            alert("Acceso denegado");
            window.location.href = "/";
            return false;
        }
        return true;
    }

    // Lógica de inicialización
    if (checkAdminAccess()) {
        // Inicializar
        loadProducts();

        // Cargar pedidos si estamos en la pestaña de pedidos (generalmente la de pedidos no es la activa por defecto)
        // Se carga solo si el filtro está presente para asegurar que los listeners de filtro funcionen correctamente
        if (orderFilterForm) {
            loadOrders('all'); // Cargar todos los pedidos por defecto
        }
    } else {
        // Si el acceso es denegado, la función checkAdminAccess ya redirigió
        return;
    }
});