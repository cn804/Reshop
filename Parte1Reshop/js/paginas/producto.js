'use strict';
/* Vista de detalle de un producto */

const contenido = document.getElementById('contenido');
const productoId = UI.param('id');

function render() {
    const p = Productos.porId(productoId);
    const u = Auth.actual();
    const esDueno = u && p && u.id === p.sellerId;
    const visible = p && (Productos.publicados().some(x => x.id === p.id) || esDueno);

    if (!visible) {
        document.title = 'Producto no disponible · ReShop';
        contenido.innerHTML = UI.vacio('Este producto no está disponible',
            'Puede que el negocio lo haya retirado o desactivado.', 'explorar.html', 'Explorar otros productos');
        return;
    }

    document.title = p.nombre + ' · ReShop';
    const vendedor = Auth.porId(p.sellerId);
    const agotado = p.stock === 0;

    const botonFavorito = `<button type="button" class="boton boton-secundario favorito" id="favorito"
        aria-pressed="${Favoritos.tiene(p.id)}" aria-label="Guardar en favoritos">♡</button>`;
    let compra;
    if (esDueno) {
        compra = `<p class="aviso-demo">Este es tu producto${p.activo ? '' : ' (inactivo: los clientes no lo ven)'}.</p>
            <a href="emprendedor-producto-form.html?id=${p.id}" class="boton">Editar producto</a>`;
    } else if (u && u.rol === 'emprendedor') {
        compra = `<p class="aviso-demo">Las cuentas de emprendedor no pueden comprar. Usa una cuenta de cliente.</p>`;
    } else if (agotado) {
        compra = `<button class="boton" disabled>Agotado</button>`;
    } else if (!u) {
        compra = `<p class="texto-gris bloque">Inicia sesión como cliente para reservar. Las reservas no requieren pago.</p>
            <div class="compra-acciones">
                <a href="login.html?next=${encodeURIComponent('producto.html?id=' + p.id)}" class="boton">Iniciar sesión para reservar</a>
                ${botonFavorito}
            </div>`;
    } else {
        compra = `
            <form class="formulario" id="form-reserva" novalidate>
                <div class="error-general" data-error="general" role="alert"></div>
                <div class="fila-campos">
                    <div class="campo">
                        <label for="cantidad">Cantidad</label>
                        <div class="cantidad">
                            <button type="button" data-paso="-1" aria-label="Quitar uno">−</button>
                            <input type="number" id="cantidad" name="cantidad" value="1" min="1" max="${p.stock}">
                            <button type="button" data-paso="1" aria-label="Agregar uno">+</button>
                        </div>
                        <span class="error-campo" data-error="cantidad"></span>
                    </div>
                    <div class="campo">
                        <label for="telefono">Teléfono de contacto</label>
                        <input type="tel" id="telefono" name="telefono" placeholder="7777-7777">
                        <span class="error-campo" data-error="telefono"></span>
                    </div>
                </div>
                <div class="campo">
                    <label for="notas">Notas (opcional)</label>
                    <input type="text" id="notas" name="notas" maxlength="200" placeholder="Hora aproximada de recogida...">
                    <span class="error-campo" data-error="notas"></span>
                </div>
                <div class="compra-acciones">
                    <button type="submit" class="boton">Reservar sin pago</button>
                    ${botonFavorito}
                </div>
            </form>`;
    }

    contenido.innerHTML = `
        <p class="texto-gris bloque"><a href="explorar.html" class="enlace">← Volver al catálogo</a></p>
        <div class="detalle">
            <div class="detalle-imagen"><img src="${UI.esc(p.imagen)}" alt="${UI.esc(p.nombre)}"></div>
            <div>
                <span class="etiqueta">${UI.esc(nombreCategoria(p.categoria))}</span>
                <h1>${UI.esc(p.nombre)}</h1>
                <a href="explorar.html?vendedor=${encodeURIComponent(p.sellerId)}" class="enlace">${UI.esc(Auth.nombreNegocio(p.sellerId))}</a>
                <div class="precios espacio-arriba">
                    <strong>${UI.dinero(p.precio)}</strong>
                    ${p.precioOriginal ? `<del>${UI.dinero(p.precioOriginal)}</del>` : ''}
                </div>
                <p class="detalle-texto">${UI.esc(p.descripcion)}</p>
                <div class="datos-lista">
                    <span><strong>Disponibilidad:</strong> ${agotado ? 'Agotado' : p.stock + ' unidades'}</span>
                    ${p.disponibleHasta ? `<span class="disponible">◷ Disponible hasta ${UI.hora(p.disponibleHasta)}</span>` : ''}
                    ${vendedor && vendedor.negocio ? `<span><strong>Dirección:</strong> ${UI.esc(vendedor.negocio.direccion)}</span>` : ''}
                </div>
                ${compra}
            </div>
        </div>`;
}

contenido.addEventListener('click', e => {
    const paso = e.target.closest('[data-paso]');
    if (paso) {
        const input = document.getElementById('cantidad');
        const nuevo = Number(input.value) + Number(paso.dataset.paso);
        input.value = Math.min(Number(input.max), Math.max(1, nuevo));
    }
    if (e.target.id === 'favorito') {
        const activo = Favoritos.alternar(productoId);
        e.target.setAttribute('aria-pressed', String(activo));
        UI.toast(activo ? 'Guardado en favoritos.' : 'Quitado de favoritos.');
    }
});

contenido.addEventListener('submit', e => {
    if (e.target.id !== 'form-reserva') return;
    e.preventDefault();
    const form = e.target;
    const r = Pedidos.reservar(Auth.actual(), productoId, UI.datosFormulario(form));
    if (!r.ok) return UI.mostrarErrores(form, r.errores);
    UI.toast(`Reserva ${r.reserva.codigo} enviada al negocio.`, 'exito');
    setTimeout(() => { location.href = 'cliente-pedidos.html'; }, 900);
});

UI.iniciar({ seccion: 'explorar', render });
