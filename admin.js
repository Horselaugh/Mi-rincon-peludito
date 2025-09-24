document.addEventListener('DOMContentLoaded', () => {
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
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    const loadMoreOrdersBtn = document.getElementById('loadMoreOrdersBtn');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Verificar si los elementos del modal existen antes de referenciarlos
    let orderModal = document.getElementById('orderModal');
    let modalClose = orderModal ? orderModal.querySelector('.modal-close') : null;
    let modalContent = orderModal ? orderModal.querySelector('.modal-content') : null;
    let saveOrderChangesBtn = document.getElementById('saveOrderChanges'); // Se creará dinámicamente

    let products = [];
    let orders = [];
    let currentPage = 1;
    let ordersPerPage = 10;
    let currentFilter = 'all';
    let currentEditingOrder = null;

    // Verificar si estamos en localhost y ajustar la URL base
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const API_BASE_URL = isLocalhost 
        ? 'http://localhost:5500/api/products' 
        : '/api/products';
    
    const ORDERS_API_URL = isLocalhost 
        ? 'http://localhost:5500/api/orders' 
        : '/api/orders';

    // Función para crear el modal de edición de pedidos si no existe
    function createOrderModalIfNeeded() {
        if (!orderModal) {
            // Crear el modal
            orderModal = document.createElement('div');
            orderModal.id = 'orderModal';
            orderModal.className = 'modal';
            orderModal.style.display = 'none';
            
            const modalContentDiv = document.createElement('div');
            modalContentDiv.className = 'modal-content';
            
            const closeSpan = document.createElement('span');
            closeSpan.className = 'modal-close';
            closeSpan.innerHTML = '&times;';
            
            modalContentDiv.appendChild(closeSpan);
            orderModal.appendChild(modalContentDiv);
            
            document.body.appendChild(orderModal);
            
            // Actualizar referencias
            modalClose = closeSpan;
            modalContent = modalContentDiv;
            
            // Agregar event listeners al modal creado
            modalClose.addEventListener('click', () => {
                orderModal.style.display = 'none';
                currentEditingOrder = null;
            });
            
            window.addEventListener('click', (e) => {
                if (e.target === orderModal) {
                    orderModal.style.display = 'none';
                    currentEditingOrder = null;
                }
            });
        }
        
        // El botón saveOrderChangesBtn se crea dentro de editOrder para asegurar que el listener sea correcto
        // y que no se duplique si el modal se abre varias veces.
    }

 async function saveOrderChangesHandler() {
    if (!currentEditingOrder) return;
    
    try {
        // Obtener elementos del DOM dentro del modal
        const customerNameInput = document.getElementById('editCustomerName');
        const customerEmailInput = document.getElementById('editCustomerEmail');
        const customerPhoneInput = document.getElementById('editCustomerPhone');
        const productQuantityInput = document.getElementById('editProductQuantity');
        const additionalNotesInput = document.getElementById('editAdditionalNotes');
        
        if (!customerNameInput || !customerEmailInput || !customerPhoneInput || !productQuantityInput) {
            throw new Error('No se pudieron encontrar los campos del formulario');
        }
        
        const updatedOrderData = {
            customerName: customerNameInput.value,
            customerEmail: customerEmailInput.value,
            customerPhone: customerPhoneInput.value,
            quantity: parseInt(productQuantityInput.value),
            notes: additionalNotesInput ? additionalNotesInput.value : ''
        };
        
        const result = await fetchWithErrorHandling(`${ORDERS_API_URL}/${currentEditingOrder.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedOrderData)
        });
        
        showAlert(result.message || 'Pedido actualizado correctamente', 'success');
        orderModal.style.display = 'none';
        currentEditingOrder = null;
        loadOrders(); // Recargar la lista de pedidos
    } catch (error) {
        console.error('Error al actualizar pedido:', error);
        showAlert(`Error al actualizar pedido: ${error.message}`, 'error');
    }
}

    // Función mejorada para hacer fetch con manejo de errores
    async function fetchWithErrorHandling(url, options = {}) {
        try {
            const response = await fetch(url, options);
            
            // Verificar si la respuesta es HTML en lugar de JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                const text = await response.text();
                if (text.includes('<!DOCTYPE') || text.includes('<html')) {
                    throw new Error(`El servidor respondió con HTML en lugar de JSON. Verifique la URL: ${url}`);
                }
            }
            
            if (!response.ok) {
                let errorMessage = `Error HTTP: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.message || errorMessage;
                } catch (e) {
                    // Si no podemos parsear como JSON, usar el texto de respuesta
                    const text = await response.text();
                    if (text) errorMessage = `${errorMessage}. Respuesta: ${text.substring(0, 100)}...`;
                }
                throw new Error(errorMessage);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error en fetch:', error);
            throw error;
        }
    }

    // Función para mostrar alertas
    function showAlert(message, type = 'info') {
        // Eliminar alertas existentes
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        
        document.body.appendChild(alert);
        
        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (alert.parentNode) {
                alert.parentNode.removeChild(alert);
            }
        }, 5000);
    }

    // Función para cargar productos desde la API
    async function loadProducts() {
        try {
            const data = await fetchWithErrorHandling(API_BASE_URL);
            
            // Asegurarnos de que products sea siempre un array
            if (Array.isArray(data)) {
                products = data;
            } else if (data.products && Array.isArray(data.products)) {
                products = data.products;
            } else if (data.data && Array.isArray(data.data)) {
                products = data.data;
            } else {
                console.warn('La respuesta de la API no contiene un array de productos:', data);
                products = [];
            }
            
            renderProductList();
        } catch (error) {
            console.error('Error al cargar productos:', error);
            showAlert(`Error al cargar productos: ${error.message}`, 'error');
            products = [];
            renderProductList();
        }
    }

    // Función para renderizar la lista de productos en la tabla
    function renderProductList() {
        if (!adminProductList) return;
        
        adminProductList.innerHTML = '';
        
        if (!Array.isArray(products) || products.length === 0) {
            adminProductList.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay productos para mostrar.</td></tr>';
            return;
        }
        
        products.forEach(product => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td data-label="ID">${product.id || 'N/A'}</td>
                <td data-label="Imagen"><img src="${product.image || ''}" alt="${product.name || 'Sin nombre'}" style="max-width: 60px; max-height: 60px;"></td>
                <td data-label="Nombre">${product.name || 'Sin nombre'}</td>
                <td data-label="Precio Actual">$${(product.currentPrice || 0).toFixed(2)}</td>
                <td data-label="Cantidad">${product.quantity || 0}</td>
                <td data-label="Categoría">${product.category || 'Sin categoría'}</td>
                <td data-label="Acciones" class="actions">
                    <button class="edit-btn" data-id="${product.id || ''}">Editar</button>
                    <button class="delete-btn" data-id="${product.id || ''}">Eliminar</button>
                </td>
            `;
            adminProductList.appendChild(row);
        });
    }

    // Función para resetear el formulario
    function resetForm() {
        if (productForm) productForm.reset();
        if (productIdInput) productIdInput.value = '';
        if (formTitle) formTitle.textContent = 'Crear Nuevo Producto';
        if (saveProductBtn) saveProductBtn.textContent = 'Guardar Producto';
        if (productFormContainer) productFormContainer.style.display = 'none';
        if (showAddProductFormBtn) showAddProductFormBtn.style.display = 'block';
    }

    // Función para cambiar entre pestañas
    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.dataset.tab;
                
                // Remover clase active de todos los botones y contenidos
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // Agregar clase active al botón y contenido seleccionado
                btn.classList.add('active');
                const tabContent = document.getElementById(`${tabId}-tab`);
                if (tabContent) tabContent.classList.add('active');
                
                // Si es la pestaña de pedidos, cargar los pedidos
                if (tabId === 'orders') {
                    loadOrders();
                }
            });
        });
    }

    // Función para cargar pedidos desde la API
    async function loadOrders() {
        try {
            const data = await fetchWithErrorHandling(`${ORDERS_API_URL}?status=${currentFilter}`);
            
            if (Array.isArray(data)) {
                orders = data;
                currentPage = 1;
                renderOrders();
            } else {
                console.warn('La respuesta de la API no contiene un array de pedidos:', data);
                orders = [];
                if (ordersContainer) {
                    ordersContainer.innerHTML = '<p>No hay pedidos para mostrar.</p>';
                }
                if (loadMoreContainer) {
                    loadMoreContainer.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Error al cargar pedidos:', error);
            showAlert(`Error al cargar pedidos: ${error.message}`, 'error');
            orders = [];
            if (ordersContainer) {
                ordersContainer.innerHTML = '<p>Error al cargar pedidos.</p>';
            }
            if (loadMoreContainer) {
                loadMoreContainer.style.display = 'none';
            }
        }
    }

    // Función para renderizar pedidos con paginación
    function renderOrders() {
        if (!ordersContainer) return;
        
        const startIndex = (currentPage - 1) * ordersPerPage;
        const endIndex = startIndex + ordersPerPage;
        const ordersToShow = orders.slice(0, endIndex);
        
        ordersContainer.innerHTML = '';
        
        if (ordersToShow.length === 0) {
            ordersContainer.innerHTML = '<p>No hay pedidos para mostrar.</p>';
            if (loadMoreContainer) loadMoreContainer.style.display = 'none';
            return;
        }
        
        ordersToShow.forEach(order => {
            const orderCard = document.createElement('div');
            // Usar order.status en lugar de order.ESTADO
            orderCard.className = `order-card ${order.status || 'pendiente'}`;
            
            orderCard.innerHTML = `
                <div class="order-header">
                    <div>
                        <span class="order-id">Pedido #${order.id}</span>
                        <span class="order-date">${new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <span class="order-status status-${order.status || 'pendiente'}">
                        ${order.status === 'pagado' ? 'Pagado' : 'Pendiente'}
                    </span>
                </div>
                
                <div class="order-customer">
                    <h4>Información del Cliente</h4>
                    <div class="customer-info">
                        <div><strong>Nombre:</strong> ${order.customerName}</div>
                        <div><strong>Email:</strong> ${order.customerEmail}</div>
                        <div><strong>Teléfono:</strong> ${order.customerPhone}</div>
                        <div><strong>Método de pago:</strong> ${order.paymentMethod}</div>
                    </div>
                    ${order.notes ? `<div><strong>Notas:</strong> ${order.notes}</div>` : ''}
                </div>
                
                <div class="order-items">
                    <h4>Productos</h4>
                    <div class="order-item">
                        <div class="item-info">
                            <div class="item-details">
                                <h4>${order.productName || 'Producto'}</h4>
                                <p>Cantidad: ${order.quantity}</p>
                            </div>
                        </div>
                        <div class="item-price">$${(order.unitPrice * order.quantity).toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="order-total">
                    Total: $${(order.unitPrice * order.quantity).toFixed(2)}
                </div>
                
                <div class="order-actions">
                    ${order.status !== 'pagado' ? `
                        <button class="btn-action btn-confirm" data-id="${order.id}">Confirmar Pago</button>
                        <button class="btn-action btn-edit" data-id="${order.id}">Modificar</button>
                        <button class="btn-action btn-delete" data-id="${order.id}">Eliminar</button>
                    ` : ''}
                </div>
            `;
            
            ordersContainer.appendChild(orderCard);
        });
        
        // Mostrar u ocultar botón de cargar más
        if (loadMoreContainer) {
            if (orders.length > endIndex) {
                loadMoreContainer.style.display = 'block';
            } else {
                loadMoreContainer.style.display = 'none';
            }
        }
        
        // Agregar event listeners a los botones de acción
        addOrderActionListeners();
    }

    // Función para agregar event listeners a los botones de acción de pedidos
    function addOrderActionListeners() {
        // Confirmar pago
        document.querySelectorAll('.btn-confirm').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.target.dataset.id;
                if (confirm('¿Estás seguro de confirmar el pago de este pedido? Esta acción actualizará el stock.')) {
                    // Usar la nueva ruta específica para actualizar el estado
                    await updateOrderStatus(orderId, 'pagado');
                }
            });
        });
        
        // Eliminar pedido
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const orderId = e.target.dataset.id;
                if (confirm('¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.')) {
                    await deleteOrder(orderId);
                }
            });
        });
        
        // Modificar pedido
        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.dataset.id;
                editOrder(orderId);
            });
        });
    }

    // Función para actualizar el estado de un pedido (usa la nueva ruta /status)
    async function updateOrderStatus(orderId, status) {
        try {
            const result = await fetchWithErrorHandling(`${ORDERS_API_URL}/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ status })
            });
            
            showAlert(result.message || 'Estado del pedido actualizado correctamente', 'success');
            loadOrders(); // Recargar la lista de pedidos
        } catch (error) {
            console.error('Error al actualizar estado del pedido:', error);
            showAlert(`Error al actualizar estado del pedido: ${error.message}`, 'error');
        }
    }

    // Función para eliminar un pedido
    async function deleteOrder(orderId) {
        try {
            const result = await fetchWithErrorHandling(`${ORDERS_API_URL}/${orderId}`, {
                method: 'DELETE'
            });
            
            showAlert(result.message || 'Pedido eliminado correctamente', 'success');
            loadOrders(); // Recargar la lista de pedidos
        } catch (error) {
            console.error('Error al eliminar pedido:', error);
            showAlert(`Error al eliminar pedido: ${error.message}`, 'error');
        }
    }

    // Función para editar un pedido
    async function editOrder(orderId) {
        try {
            const order = orders.find(o => o.id == orderId); // Usar order.id
            if (!order) {
                throw new Error('Pedido no encontrado');
            }
            
            currentEditingOrder = order;
            
            // Crear el modal si no existe
            createOrderModalIfNeeded();
            
            // Limpiar contenido previo del modal
            if (modalContent) modalContent.innerHTML = '';
            
            // Agregar botón de cerrar
            const closeSpan = document.createElement('span');
            closeSpan.className = 'modal-close';
            closeSpan.innerHTML = '&times;';
            if (modalContent) modalContent.appendChild(closeSpan);
            
            // Agregar título
            const title = document.createElement('h2');
            title.textContent = `Editar Pedido #${order.id}`; // Usar order.id
            if (modalContent) modalContent.appendChild(title);
            
            // Crear formulario de edición
            const form = document.createElement('form');
            form.className = 'modal-form';
            
            form.innerHTML = `
                <div class="form-group">
                    <label for="editCustomerName">Nombre del Cliente:</label>
                    <input type="text" id="editCustomerName" value="${order.customerName}" required>
                </div>
                
                <div class="form-group">
                    <label for="editCustomerEmail">Email:</label>
                    <input type="email" id="editCustomerEmail" value="${order.customerEmail}" required>
                </div>
                
                <div class="form-group">
                    <label for="editCustomerPhone">Teléfono:</label>
                    <input type="tel" id="editCustomerPhone" value="${order.customerPhone}" required>
                </div>
                
                <div class="form-group">
                    <label for="editProductQuantity">Cantidad:</label>
                    <input type="number" id="editProductQuantity" min="1" value="${order.quantity}" required>
                </div>
                
                <div class="form-group">
                    <label for="editAdditionalNotes">Notas Adicionales:</label>
                    <textarea id="editAdditionalNotes">${order.notes || ''}</textarea>
                </div>
            `;
            
            if (modalContent) modalContent.appendChild(form);
            
            // Agregar botón de guardar cambios
            // Recrear el botón para asegurar que el listener no se duplique
            let saveBtn = document.getElementById('saveOrderChanges');
            if (saveBtn) saveBtn.remove(); // Eliminar el botón anterior si existe
            
            saveBtn = document.createElement('button');
            saveBtn.id = 'saveOrderChanges';
            saveBtn.textContent = 'Guardar Cambios';
            saveBtn.className = 'btn-primary';
            saveBtn.addEventListener('click', saveOrderChangesHandler);
            if (modalContent) modalContent.appendChild(saveBtn);
            
            // Mostrar el modal
            if (orderModal) orderModal.style.display = 'block';
            
        } catch (error) {
            console.error('Error al cargar pedido para edición:', error);
            showAlert(`Error al cargar pedido para edición: ${error.message}`, 'error');
        }
    }

    // Event Listeners
    if (showAddProductFormBtn) {
        showAddProductFormBtn.addEventListener('click', () => {
            resetForm();
            if (productFormContainer) productFormContainer.style.display = 'block';
            showAddProductFormBtn.style.display = 'none';
        });
    }
    
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetForm);
    }
    
// ... (código existente)

if (saveProductBtn) {
    saveProductBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const productData = {
            id: productIdInput.value || null,
            name: productNameInput.value,
            description: productDescriptionInput.value,
            oldPrice: parseFloat(productOldPriceInput.value) || null,
            currentPrice: parseFloat(productCurrentPriceInput.value),
            image: productImageInput.value,
            stars: parseFloat(productStarsInput.value) || 0,
            quantity: parseInt(productQuantityInput.value),
            category: productCategoryInput.value
        };
        
        try {
            // Verificar que todos los campos requeridos estén presentes
            if (!productData.name || !productData.currentPrice || !productData.quantity || !productData.category) {
                throw new Error('Faltan campos obligatorios: nombre, precio actual, cantidad o categoría');
            }
            
            const url = productData.id ? `${API_BASE_URL}/${productData.id}` : API_BASE_URL;
            const method = productData.id ? 'PUT' : 'POST';
            
            const result = await fetchWithErrorHandling(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(productData)
            });
            
            showAlert(result.message || 'Producto guardado correctamente', 'success');
            resetForm();
            loadProducts();
        } catch (error) {
            console.error('Error al guardar producto:', error);
            showAlert(`Error al guardar producto: ${error.message}`, 'error');
        }
    });
}

// ... (resto del código existente)
    
    // Delegación de eventos para los botones de editar y eliminar productos
    if (adminProductList) {
        adminProductList.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-btn')) {
                const productId = e.target.dataset.id;
                editProduct(productId);
            } else if (e.target.classList.contains('delete-btn')) {
                const productId = e.target.dataset.id;
                deleteProduct(productId);
            }
        });
    }
    
    if (applyFilterBtn && orderStatusFilter) {
        applyFilterBtn.addEventListener('click', () => {
            currentFilter = orderStatusFilter.value;
            loadOrders();
        });
    }
    
    if (loadMoreOrdersBtn) {
        loadMoreOrdersBtn.addEventListener('click', () => {
            currentPage++;
            renderOrders();
        });
    }

    // Función para editar un producto
    async function editProduct(productId) {
        try {
            const product = products.find(p => p.id == productId);
            if (!product) {
                throw new Error('Producto no encontrado');
            }
            
            // Llenar el formulario con los datos del producto
            if (productIdInput) productIdInput.value = product.id;
            if (productNameInput) productNameInput.value = product.name;
            if (productDescriptionInput) productDescriptionInput.value = product.description;
            if (productOldPriceInput) productOldPriceInput.value = product.oldPrice;
            if (productCurrentPriceInput) productCurrentPriceInput.value = product.currentPrice;
            if (productImageInput) productImageInput.value = product.image;
            if (productStarsInput) productStarsInput.value = product.stars;
            if (productQuantityInput) productQuantityInput.value = product.quantity;
            if (productCategoryInput) productCategoryInput.value = product.category;
            
            // Cambiar el título y el texto del botón
            if (formTitle) formTitle.textContent = 'Editar Producto';
            if (saveProductBtn) saveProductBtn.textContent = 'Actualizar Producto';
            
            // Mostrar el formulario
            if (productFormContainer) productFormContainer.style.display = 'block';
            if (showAddProductFormBtn) showAddProductFormBtn.style.display = 'none';
            
        } catch (error) {
            console.error('Error al cargar producto para edición:', error);
            showAlert(`Error al cargar producto para edición: ${error.message}`, 'error');
        }
    }

    // Función para eliminar un producto
    async function deleteProduct(productId) {
        if (confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
            try {
                const result = await fetchWithErrorHandling(`${API_BASE_URL}/${productId}`, {
                    method: 'DELETE'
                });
                
                showAlert(result.message || 'Producto eliminado correctamente', 'success');
                loadProducts();
            } catch (error) {
                console.error('Error al eliminar producto:', error);
                showAlert(`Error al eliminar producto: ${error.message}`, 'error');
            }
        }
    }

    // ... código existente ...

async function loadOrders() {
    try {
        let url = ORDERS_API_URL;
        if (currentFilter !== 'all') {
            url = `${ORDERS_API_URL}?status=${currentFilter}`;
        }
        
        const data = await fetchWithErrorHandling(url);
        
        if (Array.isArray(data)) {
            orders = data;
            currentPage = 1;
            renderOrders();
        } else {
            console.warn('La respuesta de la API no contiene un array de pedidos:', data);
            orders = [];
            if (ordersContainer) {
                ordersContainer.innerHTML = '<p>No hay pedidos para mostrar.</p>';
            }
            if (loadMoreContainer) {
                loadMoreContainer.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error al cargar pedidos:', error);
        showAlert(`Error al cargar pedidos: ${error.message}`, 'error');
        orders = [];
        if (ordersContainer) {
            ordersContainer.innerHTML = '<p>Error al cargar pedidos.</p>';
        }
        if (loadMoreContainer) {
            loadMoreContainer.style.display = 'none';
        }
    }
}

function renderOrders() {
    if (!ordersContainer) return;
    
    const startIndex = (currentPage - 1) * ordersPerPage;
    const endIndex = startIndex + ordersPerPage;
    const ordersToShow = orders.slice(0, endIndex);
    
    ordersContainer.innerHTML = '';
    
    if (ordersToShow.length === 0) {
        ordersContainer.innerHTML = '<p>No hay pedidos para mostrar.</p>';
        if (loadMoreContainer) loadMoreContainer.style.display = 'none';
        return;
    }
    
    ordersToShow.forEach(order => {
        const orderCard = document.createElement('div');
        orderCard.className = `order-card ${order.status || 'pendiente'}`;
        
        orderCard.innerHTML = `
            <div class="order-header">
                <div>
                    <span class="order-id">Pedido #${order.id}</span>
                    <span class="order-date">${new Date(order.date).toLocaleDateString()}</span>
                </div>
                <span class="order-status status-${order.status || 'pendiente'}">
                    ${order.status === 'pagado' ? 'Pagado' : 
                      order.status === 'pendiente' ? 'Pendiente' : 
                      order.status === 'pagado' ? 'pagado' : 
                      order.status}
                </span>
            </div>
            
            <div class="order-customer">
                <h4>Información del Cliente</h4>
                <div class="customer-info">
                    <div><strong>Nombre:</strong> ${order.customerName}</div>
                    <div><strong>Email:</strong> ${order.customerEmail}</div>
                    <div><strong>Teléfono:</strong> ${order.customerPhone}</div>
                    <div><strong>Método de pago:</strong> ${order.paymentMethod}</div>
                </div>
                ${order.notes ? `<div><strong>Notas:</strong> ${order.notes}</div>` : ''}
            </div>
            
            <div class="order-items">
                <h4>Productos</h4>
                <div class="order-item">
                    <div class="item-info">
                        <div class="item-details">
                            <h4>${order.productName || order.serviceName || 'Producto'}</h4>
                            <p>Cantidad: ${order.quantity}</p>
                        </div>
                    </div>
                    <div class="item-price">$${(order.unitPrice * order.quantity).toFixed(2)}</div>
                </div>
            </div>
            
            <div class="order-total">
                Total: $${(order.unitPrice * order.quantity).toFixed(2)}
            </div>
            
            <div class="order-actions">
                ${order.status !== 'pagado' ? `
                    <button class="btn-action btn-confirm" data-id="${order.id}">Confirmar Pago</button>
                    <button class="btn-action btn-edit" data-id="${order.id}">Modificar</button>
                    <button class="btn-action btn-delete" data-id="${order.id}">Eliminar</button>
                ` : ''}
            </div>
        `;
        
        ordersContainer.appendChild(orderCard);
    });
    
    if (loadMoreContainer) {
        if (orders.length > endIndex) {
            loadMoreContainer.style.display = 'block';
        } else {
            loadMoreContainer.style.display = 'none';
        }
    }
    
    addOrderActionListeners();
}

function addOrderActionListeners() {
    // Confirmar pago
    document.querySelectorAll('.btn-confirm').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const orderId = e.target.dataset.id;
            if (confirm('¿Estás seguro de confirmar el pago de este pedido? Esta acción actualizará el stock.')) {
                await updateOrderStatus(orderId, 'pagado');
            }
        });
    });
    
    // Eliminar pedido
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const orderId = e.target.dataset.id;
            if (confirm('¿Estás seguro de eliminar este pedido? Esta acción no se puede deshacer.')) {
                await deleteOrder(orderId);
            }
        });
    });
    
    // Modificar pedido
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const orderId = e.target.dataset.id;
            editOrder(orderId);
        });
    });
}


    // Inicializar
    loadProducts();
    
    // Cargar pedidos si estamos en la pestaña de pedidos
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'orders-tab') {
        loadOrders();
    }
});

// Al inicio de admin.js o en un script en admin.html
const ADMIN_PASSWORD = "tu-contraseña-segura"; // Cambia esto

function checkAdminAccess() {
    const password = prompt("Ingrese la contraseña de administrador:");
    if (password !== ADMIN_PASSWORD) {
        alert("Acceso denegado");
        window.location.href = "/";
        return false;
    }
    return true;
}

// Llamar esta función cuando se cargue admin.html
document.addEventListener('DOMContentLoaded', function() {
    if (!checkAdminAccess()) {
        return;
    }
    // Continuar con la carga normal del panel
});