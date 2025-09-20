// Variables globales
let cart = [];
let orderModal;
let orderForm;
let cartDropdown;
let cartButton;
let closeButton;
let checkoutButton;
let emptyCartButton;
let contentProducts;
let totalElement;
let cartCountElement;
let orderSummaryElement;
let allProducts = []; // Para almacenar todos los productos cargados y facilitar la búsqueda

// Inicializar la aplicación cuando el DOM esté cargado
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Función para inicializar la aplicación
function initializeApp() {
    // Inicializar variables después de que el DOM esté listo
    orderModal = document.getElementById('orderModal');
    orderForm = document.getElementById('orderForm');
    cartDropdown = document.getElementById('cartDropdown');
    cartButton = document.getElementById('cartButton');
    closeButton = document.querySelector('.modal .close-button');
    checkoutButton = document.getElementById('checkoutButton');
    emptyCartButton = document.getElementById('emptyCart');
    contentProducts = document.getElementById('contentProducts');
    totalElement = document.getElementById('total');
    cartCountElement = document.querySelector('.cart-count');
    orderSummaryElement = document.getElementById('orderSummary');
    
    // Configurar event listeners
    if (orderForm) {
        orderForm.addEventListener('submit', handleOrderSubmit);
    }
    if (cartButton) {
        cartButton.addEventListener('click', toggleCartDropdown);
    }
    if (closeButton) {
        closeButton.addEventListener('click', () => orderModal.style.display = 'none');
    }
    if (checkoutButton) {
        checkoutButton.addEventListener('click', openOrderModal);
    }
    if (emptyCartButton) {
        emptyCartButton.addEventListener('click', emptyCart);
    }

    // Event listener para los botones de servicio
    document.querySelectorAll('.btn-service[data-service]').forEach(button => {
        button.addEventListener('click', function() {
            const serviceName = this.dataset.service;
            const servicePrice = parseFloat(this.dataset.price);
            addServiceToCart(serviceName, servicePrice);
        });
    });

    // Event listener para el formulario de búsqueda
    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearchSubmit);
    }

    // Cerrar el dropdown del carrito si se hace clic fuera
    document.addEventListener('click', function(event) {
        if (cartDropdown && cartButton && !cartDropdown.contains(event.target) && !cartButton.contains(event.target)) {
            cartDropdown.style.display = 'none';
            cartDropdown.style.opacity = '0';
            cartDropdown.style.transform = 'translateY(10px)';
        }
        // Cerrar el modal si se hace clic fuera de su contenido
        if (orderModal && event.target == orderModal) {
            orderModal.style.display = 'none';
        }
    });
    
    // Inicializar carrito desde localStorage si existe
    loadCartFromStorage();
    
    // Cargar productos
    loadProducts();
}

// Función para cargar productos desde el backend
async function loadProducts() {
    try {
        console.log('Cargando productos...');
        
        // Cargar juguetes caninos
        const responseCaninos = await fetch('/api/juguetes-caninos');
        if (!responseCaninos.ok) {
            throw new Error(`Error HTTP al cargar juguetes caninos: ${responseCaninos.status}`);
        }
        const caninos = await responseCaninos.json();
        console.log('Juguetes caninos:', caninos);
        displayProducts(caninos, 'juguetes-caninos-container');
        allProducts = allProducts.concat(caninos.map(p => ({ ...p, category: 'canino' })));
        
        // Cargar juguetes gatunos
        const responseGatunos = await fetch('/api/juguetes-gatunos');
        if (!responseGatunos.ok) {
            throw new Error(`Error HTTP al cargar juguetes gatunos: ${responseGatunos.status}`);
        }
        const gatunos = await responseGatunos.json();
        console.log('Juguetes gatunos:', gatunos);
        displayProducts(gatunos, 'juguetes-gatunos-container');
        allProducts = allProducts.concat(gatunos.map(p => ({ ...p, category: 'gatuno' })));
        
        // Cargar accesorios
        const responseAccesorios = await fetch('/api/accesorios');
        if (!responseAccesorios.ok) {
            throw new Error(`Error HTTP al cargar accesorios: ${responseAccesorios.status}`);
        }
        const accesorios = await responseAccesorios.json();
        console.log('Accesorios:', accesorios);
        displayProducts(accesorios, 'accesorios-container');
        allProducts = allProducts.concat(accesorios.map(p => ({ ...p, category: 'accesorio' })));

        // Si no hay productos en ninguna categoría, mostrar un mensaje general
        if (allProducts.length === 0) {
            document.querySelectorAll('.products-grid').forEach(container => {
                const loadingElement = container.querySelector('.loading');
                if (loadingElement) {
                    loadingElement.remove();
                }
                if (container.innerHTML.trim() === '') { // Si el contenedor está vacío después de intentar cargar
                    container.innerHTML = '<div class="no-products" style="text-align: center; width: 100%;">No hay productos disponibles en esta categoría.</div>';
                }
            });
        }
        
    } catch (error) {
        console.error('Error al cargar productos:', error);
        document.querySelectorAll('.loading').forEach(el => {
            el.textContent = `Error al cargar los productos: ${error.message}. Intenta nuevamente más tarde.`;
            el.style.color = '#f44336'; // Color de error
        });
    }
}

// Función para mostrar productos en el DOM
function displayProducts(products, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Contenedor ${containerId} no encontrado`);
        return;
    }
    
    // Eliminar mensaje de carga
    const loadingElement = container.querySelector('.loading');
    if (loadingElement) {
        loadingElement.remove();
    }
    
    // Verificar si hay productos
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="no-products" style="text-align: center; width: 100%;">No hay productos disponibles en esta categoría</div>';
        return;
    }
    
    // Crear elementos de productos
    container.innerHTML = '';
    
    products.forEach(product => {
        const productElement = document.createElement('div');
        productElement.className = 'product'; // Cambiado de product-card a product para usar estilos existentes
        
        // Normalizar propiedades del producto
        const productId = product.id;
        const productName = product.nombre;
        const productPrice = product.precio;
        const productImage = product.imagen;
        const productDescription = product.descripcion || 'Sin descripción';
        
        productElement.innerHTML = `
            <img src="${productImage || 'https://via.placeholder.com/200x200?text=Imagen+No+Disponible'}" 
                 alt="${productName}" 
                 onerror="this.src='https://via.placeholder.com/200x200?text=Imagen+No+Disponible'">
            <div class="product-info">
                <h4>${productName}</h4>
                <p class="product-text">${productDescription}</p>
                <div class="price">
                    <p>$${productPrice.toFixed(2)}</p>
                </div>
                <button type="button" class="btn-add" onclick="addToCart({
                    id: ${productId}, 
                    name: '${productName.replace(/'/g, "\\'")}', 
                    price: ${productPrice}, 
                    image: '${(productImage || '').replace(/'/g, "\\'")}'
                })">
                    <i class="fa-solid fa-cart-plus"></i> Añadir al carrito
                </button>
            </div>
        `;
        container.appendChild(productElement);
    });
}

// Función para manejar el envío del formulario de pedido
async function handleOrderSubmit(e) {
    e.preventDefault();
    
    // Validar formulario
    if (!validateOrderForm()) {
        showNotification('Por favor, completa todos los campos requeridos correctamente.', 'error');
        return;
    }
    
    // Obtener datos del formulario
    const customerName = document.getElementById('customerName').value;
    const customerEmail = document.getElementById('customerEmail').value;
    const customerPhone = document.getElementById('customerPhone').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const orderNotes = document.getElementById('orderNotes').value;
    
    // Validar que el carrito no esté vacío
    if (cart.length === 0) {
        showNotification('El carrito está vacío. Agrega productos antes de enviar el pedido.', 'error');
        return;
    }
    
    // Preparar datos para enviar al servidor
    const orderData = {
        customer: {
            name: customerName,
            email: customerEmail,
            phone: customerPhone,
            paymentMethod: paymentMethod
        },
        items: cart.map(item => ({
            id: item.id, 
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            totalItem: item.price * item.quantity,
            isService: item.isService || false // Añadir si es un servicio
        })),
        total: calculateTotal(),
        notes: orderNotes,
        timestamp: new Date().toISOString()
    };
    
    try {
        // Mostrar indicador de carga
        const loadingNotification = showNotification('Procesando tu pedido...', 'loading');
        
        // Enviar pedido al servidor
        const result = await sendOrderToServer(orderData);
        
        // Eliminar notificación de carga
        if (loadingNotification && loadingNotification.parentNode) {
            loadingNotification.parentNode.removeChild(loadingNotification);
        }

        // Mostrar mensaje de éxito
        showNotification('¡Pedido enviado con éxito! Te contactaremos pronto.', 'success');
        
        // Cerrar el modal
        if (orderModal) {
            orderModal.style.display = 'none';
        }
        
        // Vaciar el carrito
        emptyCart();
        
        // Limpiar el formulario
        if (orderForm) {
            orderForm.reset();
        }
    } catch (error) {
        // Eliminar notificación de carga si existe
        const existingLoadingNotification = document.getElementById('global-notification');
        if (existingLoadingNotification && existingLoadingNotification.textContent.includes('Procesando')) {
            existingLoadingNotification.parentNode.removeChild(existingLoadingNotification);
        }
        // Mostrar mensaje de error
        showNotification(`Error: ${error.message}`, 'error');
        console.error('Error al procesar el pedido:', error);
    }
}

// Función para enviar el pedido al servidor
async function sendOrderToServer(orderData) {
    try {
        const response = await fetch('/api/process-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        // Verificar si la respuesta es JSON válido
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error('Respuesta del servidor no es JSON válido');
        }

        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Error al procesar el pedido');
        }
        
        return result;
    } catch (error) {
        console.error('Error al enviar el pedido:', error);
        
        // Mejor manejo de errores específicos
        if (error.message.includes('JSON')) {
            throw new Error('Error en el formato de respuesta del servidor. Contacta al administrador.');
        } else if (error.message.includes('Failed to fetch')) {
            throw new Error('No se pudo conectar con el servidor. Verifica tu conexión a internet.');
        } else {
            throw new Error('Error al procesar el pedido. Por favor, intenta nuevamente.');
        }
    }
}

// Función para calcular el total del carrito
function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// Función para vaciar el carrito
function emptyCart() {
    cart = [];
    updateCartUI();
    saveCartToStorage();
    showNotification('El carrito ha sido vaciado.', 'info');
}

// Función para validar el formulario de pedido
function validateOrderForm() {
    const name = document.getElementById('customerName');
    const email = document.getElementById('customerEmail');
    const phone = document.getElementById('customerPhone');
    const paymentMethod = document.getElementById('paymentMethod');
    let isValid = true;
    
    // Validar nombre
    if (!name.value.trim()) {
        highlightFieldError(name, 'Por favor ingresa tu nombre completo');
        isValid = false;
    } else {
        clearFieldError(name);
    }
    
    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.value.trim() || !emailRegex.test(email.value)) {
        highlightFieldError(email, 'Por favor ingresa un email válido');
        isValid = false;
    } else {
        clearFieldError(email);
    }
    
    // Validar teléfono
    const phoneRegex = /^[0-9]{10}$/;
    if (!phone.value.trim() || !phoneRegex.test(phone.value)) {
        highlightFieldError(phone, 'Por favor ingresa un número de teléfono válido (10 dígitos)');
        isValid = false;
    } else {
        clearFieldError(phone);
    }
    
    // Validar método de pago
    if (!paymentMethod.value) {
        highlightFieldError(paymentMethod, 'Por favor selecciona un método de pago');
        isValid = false;
    } else {
        clearFieldError(paymentMethod);
    }
    
    return isValid;
}

// Función para resaltar campo con error
function highlightFieldError(field, message) {
    field.style.borderColor = '#ff4444';
    
    // Mostrar mensaje de error
    let errorElement = field.nextElementSibling;
    if (!errorElement || !errorElement.classList.contains('error-message')) {
        errorElement = document.createElement('small');
        errorElement.classList.add('error-message');
        errorElement.style.color = '#ff4444';
        errorElement.style.display = 'block'; // Asegurar que el mensaje se muestre en una nueva línea
        field.parentNode.insertBefore(errorElement, field.nextSibling);
    }
    errorElement.textContent = message;
}

// Función para limpiar error de campo
function clearFieldError(field) {
    field.style.borderColor = '';
    
    // Eliminar mensaje de error
    const errorElement = field.nextElementSibling;
    if (errorElement && errorElement.classList.contains('error-message')) {
        errorElement.remove();
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    // Eliminar notificación existente si hay una
    const existingNotification = document.getElementById('global-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.id = 'global-notification';
    notification.textContent = message;
    
    // Estilos base
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '4px';
    notification.style.color = 'white';
    notification.style.zIndex = '10000';
    notification.style.maxWidth = '300px';
    notification.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    notification.style.transition = 'opacity 0.3s ease-in-out, transform 0.3s ease-in-out';
    notification.style.opacity = '0';
    notification.style.transform = 'translateX(100%)';
    
    // Estilos según el tipo
    switch(type) {
        case 'success':
            notification.style.background = '#4CAF50';
            break;
        case 'error':
            notification.style.background = '#f44336';
            break;
        case 'loading':
            notification.style.background = '#2196F3';
            break;
        default:
            notification.style.background = '#333';
    }
    
    // Agregar al documento
    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
    }, 10); // Pequeño retraso para asegurar la transición

    // Auto-eliminar después de 5 segundos (excepto para loading)
    if (type !== 'loading') {
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                notification.addEventListener('transitionend', () => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, { once: true });
            }
        }, 5000);
    } else {
        // Para notificaciones de carga, no se eliminan automáticamente,
        // deben ser eliminadas explícitamente por el código que las creó.
        // Se añade un ID para facilitar su eliminación.
        notification.id = 'loading-notification';
    }
    
    return notification;
}

// Función para actualizar la interfaz del carrito
function updateCartUI() {
    if (!contentProducts || !totalElement || !cartCountElement) {
        console.error('Elementos del carrito no encontrados');
        return;
    }
    
    // Actualizar lista de productos en el carrito
    contentProducts.innerHTML = '';
    
    if (cart.length === 0) {
        contentProducts.innerHTML = '<p class="empty-cart-message">Tu carrito está vacío</p>';
        if (totalElement) totalElement.textContent = '$0.00';
        if (cartCountElement) cartCountElement.textContent = '0';
        return;
    }
    
    cart.forEach(item => {
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <img src="${item.image || 'https://via.placeholder.com/50x50?text=Imagen'}" 
                 alt="${item.name}" 
                 onerror="this.src='https://via.placeholder.com/50x50?text=Imagen'">
            <div class="cart-item-info">
                <h4>${item.name}</h4>
                <p>$${item.price.toFixed(2)} x ${item.quantity}</p>
            </div>
            <div class="cart-item-actions">
                <button class="btn-quantity" onclick="updateQuantity(${item.id}, ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button class="btn-quantity" onclick="updateQuantity(${item.id}, ${item.quantity + 1})">+</button>
                <button class="btn-remove" onclick="removeFromCart(${item.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        contentProducts.appendChild(cartItem);
    });
    
    // Actualizar total
    const total = calculateTotal();
    totalElement.textContent = `$${total.toFixed(2)}`;
    
    // Actualizar contador
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElement.textContent = totalItems.toString();
    
    // Actualizar resumen en el modal
    updateOrderSummary();
}

// Función para actualizar el resumen del pedido en el modal
function updateOrderSummary() {
    if (!orderSummaryElement) return;
    
    orderSummaryElement.innerHTML = '';
    
    if (cart.length === 0) {
        orderSummaryElement.innerHTML = '<p>No hay productos en el carrito</p>';
        return;
    }
    
    cart.forEach(item => {
        const summaryItem = document.createElement('div');
        summaryItem.className = 'order-summary-item';
        summaryItem.innerHTML = `
            <span>${item.name} x${item.quantity}</span>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        `;
        orderSummaryElement.appendChild(summaryItem);
    });
    
    const totalItem = document.createElement('div');
    totalItem.className = 'order-summary-total';
    totalItem.innerHTML = `
        <strong>Total:</strong>
        <strong>$${calculateTotal().toFixed(2)}</strong>
    `;
    orderSummaryElement.appendChild(totalItem);
}

// Función para guardar carrito en localStorage
function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Función para cargar carrito desde localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        try {
            cart = JSON.parse(savedCart);
            updateCartUI();
        } catch (e) {
            console.error('Error al cargar carrito desde localStorage:', e);
            cart = [];
        }
    }
}

// Función para alternar la visibilidad del dropdown del carrito
function toggleCartDropdown() {
    if (!cartDropdown) return;
    
    if (cartDropdown.style.display === 'block') {
        cartDropdown.style.display = 'none';
        cartDropdown.style.opacity = '0';
        cartDropdown.style.transform = 'translateY(10px)';
    } else {
        cartDropdown.style.display = 'block';
        setTimeout(() => {
            cartDropdown.style.opacity = '1';
            cartDropdown.style.transform = 'translateY(0)';
        }, 10);
    }
}

// Función para abrir el modal de pedido
function openOrderModal() {
    if (!orderModal) return;
    
    if (cart.length === 0) {
        showNotification('El carrito está vacío. Agrega productos antes de continuar.', 'error');
        return;
    }
    
    orderModal.style.display = 'block';
    updateOrderSummary();
}

// Función para añadir producto al carrito
function addToCart(product) {
    // Buscar si el producto ya está en el carrito
    const existingItem = cart.find(item => item.id === product.id && !item.isService);
    
    if (existingItem) {
        // Incrementar cantidad si ya existe
        existingItem.quantity += 1;
    } else {
        // Agregar nuevo producto al carrito
        cart.push({
            ...product,
            quantity: 1,
            isService: false
        });
    }
    
    updateCartUI();
    saveCartToStorage();
    showNotification(`${product.name} añadido al carrito`, 'success');
}

// Función para añadir servicio al carrito
function addServiceToCart(serviceName, servicePrice) {
    // Buscar si el servicio ya está en el carrito
    const existingItem = cart.find(item => item.name === serviceName && item.isService);
    
    if (existingItem) {
        // Incrementar cantidad si ya existe
        existingItem.quantity += 1;
    } else {
        // Agregar nuevo servicio al carrito
        cart.push({
            id: Date.now(), // ID único basado en timestamp
            name: serviceName,
            price: servicePrice,
            quantity: 1,
            isService: true
        });
    }
    
    updateCartUI();
    saveCartToStorage();
    showNotification(`${serviceName} añadido al carrito`, 'success');
}

// Función para actualizar cantidad de un producto en el carrito
function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    
    if (!item) return;
    
    if (newQuantity <= 0) {
        removeFromCart(productId);
    } else {
        item.quantity = newQuantity;
        updateCartUI();
        saveCartToStorage();
    }
}

// Función para eliminar producto del carrito
function removeFromCart(productId) {
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex !== -1) {
        const removedItem = cart[itemIndex];
        cart.splice(itemIndex, 1);
        updateCartUI();
        saveCartToStorage();
        showNotification(`${removedItem.name} eliminado del carrito`, 'info');
    }
}

// Función para manejar la búsqueda de productos
function handleSearchSubmit(e) {
    e.preventDefault();
    
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (!searchTerm) {
        // Si no hay término de búsqueda, mostrar todos los productos
        loadProducts();
        return;
    }
    
    // Filtrar productos según el término de búsqueda
    const filteredProducts = allProducts.filter(product => 
        product.nombre.toLowerCase().includes(searchTerm) || 
        (product.descripcion && product.descripcion.toLowerCase().includes(searchTerm))
    );
    
    // Mostrar resultados
    displaySearchResults(filteredProducts);
}

// Función para mostrar resultados de búsqueda
function displaySearchResults(products) {
    // Ocultar todas las secciones de productos
    document.querySelectorAll('.products-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Crear o mostrar sección de resultados de búsqueda
    let searchResultsContainer = document.getElementById('searchResultsContainer');
    if (!searchResultsContainer) {
        searchResultsContainer = document.createElement('div');
        searchResultsContainer.id = 'searchResultsContainer';
        searchResultsContainer.className = 'products-section';
        searchResultsContainer.innerHTML = '<h2>Resultados de búsqueda</h2><div class="products-grid" id="searchResultsGrid"></div>';
        document.querySelector('.products-container').appendChild(searchResultsContainer);
    }
    
    searchResultsContainer.style.display = 'block';
    
    // Mostrar productos encontrados
    const searchResultsGrid = document.getElementById('searchResultsGrid');
    if (products.length === 0) {
        searchResultsGrid.innerHTML = '<p class="no-results">No se encontraron productos que coincidan con tu búsqueda.</p>';
    } else {
        displayProducts(products, 'searchResultsGrid');
    }
}