document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('reservaForm');
    const submitButton = document.getElementById('submit-button');
    const mensajeConfirmacion = document.getElementById('mensaje-confirmacion');
    const productLists = document.querySelectorAll('.product-list');
    const selectedProductsList = document.getElementById('lista-productos-seleccionados');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const totalAmountSpan = document.getElementById('total-amount');

    const selectedProducts = new Map();

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(amount);
    };

    const updateTotal = () => {
        let total = 0;
        for (const item of selectedProducts.values()) {
            total += item.price * item.quantity;
        }
        totalAmountSpan.textContent = formatCurrency(total);
    };

    const updateCartMessage = () => {
        emptyCartMessage.style.display = selectedProducts.size === 0 ? 'list-item' : 'none';
    };

    updateTotal();
    updateCartMessage();

    productLists.forEach(list => {
        list.addEventListener('click', (e) => {
            const productItem = e.target.closest('.product-item');
            if (!productItem || productItem.classList.contains('added')) {
                return;
            }

            const productName = productItem.dataset.name;
            const productPrice = parseInt(productItem.dataset.price, 10);

            if (isNaN(productPrice)) {
                console.error("Precio inválido para el producto:", productName);
                return;
            }

            selectedProducts.set(productName, { price: productPrice, quantity: 1 });
            productItem.classList.add('added');
            
            const li = document.createElement('li');
            li.dataset.name = productName;

            let quantitySelectHTML = '<select class="quantity-input" aria-label="Cantidad">';
            for (let i = 1; i <= 5; i++) {
                quantitySelectHTML += `<option value="${i}">${i}</option>`;
            }
            quantitySelectHTML += '</select>';

            li.innerHTML = `
                <span class="product-cart-name">${productName}</span>
                <div class="cart-controls">
                    ${quantitySelectHTML}
                    <button type="button" class="remove-item-btn">×</button>
                </div>
            `;
            selectedProductsList.appendChild(li);
            
            updateTotal();
            updateCartMessage();
        });
    });

    selectedProductsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('remove-item-btn')) {
            const liToRemove = e.target.closest('li');
            const productName = liToRemove.dataset.name;

            selectedProducts.delete(productName);
            liToRemove.remove();

            const originalProductItem = document.querySelector(`.product-item[data-name="${productName}"]`);
            if (originalProductItem) {
                originalProductItem.classList.remove('added');
            }
            
            updateTotal();
            updateCartMessage();
        }
    });

    selectedProductsList.addEventListener('change', (e) => {
        if (e.target.classList.contains('quantity-input')) {
            const liItem = e.target.closest('li');
            const productName = liItem.dataset.name;
            const productData = selectedProducts.get(productName);

            if (productData) {
                const newQuantity = parseInt(e.target.value, 10);
                if (!isNaN(newQuantity) && newQuantity > 0) {
                    productData.quantity = newQuantity;
                    selectedProducts.set(productName, productData);
                    updateTotal();
                }
            }
        }
    });

    // --- LÓGICA DE ENVÍO CON FIREBASE ---
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (selectedProducts.size === 0) {
            alert('Por favor, agrega al menos un producto a tu reserva.');
            return;
        }

        // Deshabilitar el botón para evitar envíos múltiples
        submitButton.disabled = true;
        submitButton.textContent = 'Enviando...';

        try {
            // Accede a las funciones de Firebase desde el objeto window
            const { db, firebaseTools } = window;
            const { collection, addDoc, serverTimestamp } = firebaseTools;

            const productDetails = [];
            for (const [name, data] of selectedProducts.entries()) {
                productDetails.push(`${data.quantity} x ${name}`);
            }

            // Crear un objeto con los datos del formulario
            const reservaData = {
                nombre: form.nombre.value,
                telefono: form.telefono.value,
                comentarios: form.comentarios.value,
                productos: productDetails,
                montoTotal: totalAmountSpan.textContent,
                fecha: serverTimestamp() // Usa la hora del servidor de Firebase
            };

            // Añadir un nuevo documento a la colección "reservas"
            const docRef = await addDoc(collection(db, "reservas"), reservaData);
            console.log("Reserva guardada con ID: ", docRef.id);

            // Mostrar mensaje de confirmación
            form.style.display = 'none';
            mensajeConfirmacion.style.display = 'block';

        } catch (error) {
            console.error("Error al guardar la reserva: ", error);
            alert("Hubo un error al enviar tu reserva. Por favor, intenta de nuevo.");
            // Habilitar el botón de nuevo si hay un error
            submitButton.disabled = false;
            submitButton.textContent = 'Enviar Reserva';
        }
    });
});

