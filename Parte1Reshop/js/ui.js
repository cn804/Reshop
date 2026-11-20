'use strict';
/* =====================================================
   RESHOP · COMPONENTES DE INTERFAZ COMPARTIDOS
   Header, footer, tarjetas, protección de páginas y avisos.
   Usa las mismas clases de estilo.css para conservar el diseño.
   ===================================================== */

const UI = {
    _seccion: '',

    /* ---------- utilidades ---------- */

    esc(texto) {
        return String(texto == null ? '' : texto).replace(/[&<>"']/g, c => (
            { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
        ));
    },

    dinero(n) {
        return '$' + Number(n || 0).toFixed(2);
    },

    fecha(iso) {
        return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
    },

    hora(hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    },

    param(nombre) {
        return new URLSearchParams(location.search).get(nombre);
    },

    paginaActual() {
        return (location.pathname.split('/').pop() || 'index.html') + location.search;
    },

    /* Solo acepta páginas internas del proyecto como destino */
    destinoSeguro(next) {
        return next && /^[a-z0-9\-]+\.html(\?[^#]*)?$/i.test(next) ? next : null;
    },

    datosFormulario(form) {
        return Object.fromEntries(new FormData(form).entries());
    },

    /* ---------- arranque de cada página ---------- */

    /*
       opciones:
       - seccion: enlace del menú que se marca como activo
       - rol: 'cliente' | 'emprendedor' → página protegida
       - soloCompradores: bloquea a emprendedores (carrito, favoritos)
       - render: función que pinta la página
       - refrescar: volver a pintar si los datos cambian en otra pestaña
    */
    iniciar(opciones) {
        const o = Object.assign({ refrescar: true }, opciones);
        if (!UI._verificarAcceso(o)) return false;

        UI._seccion = o.seccion || '';
        UI.renderHeader();
        UI.renderFooter();
        UI._mostrarAvisoUrl();
        /* Pinta la página cuando data/ejemplos.json ya se cargó */
        Datos.listo.then(() => {
            UI.renderHeader();
            if (o.render) o.render();
        });

        window.addEventListener('storage', e => {
            if (!e.key || !e.key.startsWith(Store.prefijo)) return;
            if (!UI._verificarAcceso(o)) return;
            UI.renderHeader();
            if (o.refrescar && o.render) o.render();
        });
        return true;
    },

    _verificarAcceso(o) {
        const u = Auth.actual();
        if (o.rol && !u) {
            location.replace('login.html?next=' + encodeURIComponent(UI.paginaActual()));
            return false;
        }
        if ((o.rol && u.rol !== o.rol) || (o.soloCompradores && u && u.rol === 'emprendedor')) {
            location.replace(Auth.inicioDeRol(u.rol) + '?aviso=rol');
            return false;
        }
        return true;
    },

    _mostrarAvisoUrl() {
        const avisos = {
            rol: ['Tu tipo de cuenta no tiene acceso a esa sección.', 'error'],
            salida: ['Cerraste sesión correctamente.', 'exito'],
            bienvenida: ['¡Bienvenido a ReShop!', 'exito'],
            guardado: ['Producto guardado.', 'exito']
        };
        const a = avisos[UI.param('aviso')];
        if (a) {
            UI.toast(a[0], a[1]);
            const url = new URL(location.href);
            url.searchParams.delete('aviso');
            history.replaceState(null, '', url);
        }
    },

    /* ---------- header y footer ---------- */

    renderHeader() {
        const el = document.getElementById('header');
        if (!el) return;
        const u = Auth.actual();

        const enlaces = [
            ['explorar', 'explorar.html', 'Explorar'],
            ['negocios', 'negocios.html', 'Negocios'],
            ['impacto', 'impacto.html', 'Impacto']
        ];
        const menu = enlaces.map(([id, href, texto]) =>
            `<a href="${href}"${id === UI._seccion ? ' class="activo" aria-current="page"' : ''}>${texto}</a>`
        ).join('');

        let acciones = '';
        if (!u || u.rol === 'cliente') {
            acciones += `<a href="favoritos.html" class="icono" aria-label="Favoritos" title="Favoritos">♡</a>`;
        }
        if (!u) {
            acciones += `<a href="login.html" class="cuenta">Mi cuenta</a>`;
        } else {
            const destino = u.rol === 'emprendedor' ? ['emprendedor-panel.html', 'Mi panel'] : ['cliente-pedidos.html', 'Mis reservas'];
            acciones += `<a href="${destino[0]}" class="cuenta" title="${UI.esc(u.nombre)}">${destino[1]}</a>`;
            acciones += `<button type="button" class="salir" data-salir>Salir</button>`;
        }
        acciones += `<button type="button" class="menu-toggle" aria-label="Abrir menú" aria-expanded="false">☰</button>`;

        el.innerHTML = `
            <div class="header-contenido">
                <a href="index.html" class="logo"><img src="img/logo.png" alt="ReShop - inicio"></a>
                <nav class="menu" aria-label="Principal">${menu}</nav>
                <div class="acciones">${acciones}</div>
            </div>`;

        const salir = el.querySelector('[data-salir]');
        if (salir) salir.addEventListener('click', () => {
            Auth.cerrarSesion();
            location.href = 'index.html?aviso=salida';
        });

        const toggle = el.querySelector('.menu-toggle');
        toggle.addEventListener('click', () => {
            const abierto = el.querySelector('.menu').classList.toggle('abierto');
            toggle.setAttribute('aria-expanded', String(abierto));
        });
    },

    renderFooter() {
        const el = document.getElementById('footer');
        if (!el) return;
        const categorias = [{ id: 'todos', nombre: 'Todos' }].concat(CATEGORIAS)
            .map(c => `<a href="explorar.html?categoria=${c.id}">${c.nombre}</a>`).join('');

        el.innerHTML = `
            <div class="footer-contenido">
                <div class="footer-columna">
                    <img src="img/logo.png" alt="Logo ReShop" class="logo-footer">
                    <p>Rescata hoy, disfruta más, desperdicia menos.</p>
                </div>
                <div class="footer-columna">
                    <h3>Explorar</h3>
                    ${categorias}
                </div>
                <div class="footer-columna">
                    <h3>Compañía</h3>
                    <a href="impacto.html">Impacto</a>
                    <a href="negocios.html">Negocios</a>
                    <a href="registro.html?rol=emprendedor">Vende en ReShop</a>
                    <a href="info.html#blog">Blog</a>
                    <a href="info.html#contacto">Contáctanos</a>
                </div>
                <div class="footer-columna">
                    <h3>Legal</h3>
                    <a href="info.html#terminos">Términos y condiciones</a>
                    <a href="info.html#privacidad">Política de privacidad</a>
                </div>
            </div>
            <div class="copyright">© 2026 ReShop. Todos los derechos reservados. · Prototipo demostrativo</div>`;
    },

    subnavEmprendedor(activo) {
        const el = document.getElementById('subnav');
        if (!el) return;
        const u = Auth.actual();
        const pendientes = Pedidos.delVendedor(u.id).filter(p => p.estado === 'Pendiente').length;
        const tabs = [
            ['panel', 'emprendedor-panel.html', 'Resumen'],
            ['productos', 'emprendedor-productos.html', 'Mis productos'],
            ['pedidos', 'emprendedor-pedidos.html', 'Reservas' + (pendientes ? ` <span class="badge">${pendientes}</span>` : '')]
        ];
        el.innerHTML = tabs.map(([id, href, texto]) =>
            `<a href="${href}"${id === activo ? ' class="activo" aria-current="page"' : ''}>${texto}</a>`
        ).join('');
    },

    /* ---------- componentes ---------- */

    tarjeta(p) {
        const agotado = p.stock <= 0;
        const original = p.precioOriginal ? `<del>${UI.dinero(p.precioOriginal)}</del>` : '';
        return `
            <article class="producto${agotado ? ' agotado' : ''}">
                <a href="producto.html?id=${encodeURIComponent(p.id)}" class="producto-enlace">
                    <img src="${UI.esc(p.imagen)}" alt="${UI.esc(p.nombre)}" loading="lazy">
                    <div class="producto-contenido">
                        <span class="etiqueta">${UI.esc(nombreCategoria(p.categoria))}</span>
                        <h3>${UI.esc(p.nombre)}</h3>
                        <p class="negocio">${UI.esc(Auth.nombreNegocio(p.sellerId))}</p>
                        <p class="descripcion">${UI.esc(p.descripcion)}</p>
                        <div class="producto-info">
                            <div class="precios"><strong>${UI.dinero(p.precio)}</strong>${original}</div>
                            <span class="distancia">${agotado ? 'Agotado' : `Quedan ${p.stock}`}</span>
                        </div>
                        ${p.disponibleHasta ? `<p class="disponible">◷ Disponible hasta ${UI.hora(p.disponibleHasta)}</p>` : ''}
                    </div>
                </a>
            </article>`;
    },

    vacio(titulo, texto, href, boton) {
        return `
            <div class="vacio">
                <h3>${titulo}</h3>
                <p>${texto}</p>
                ${href ? `<a href="${href}" class="boton">${boton}</a>` : ''}
            </div>`;
    },

    estado(estado) {
        const slug = estado.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');
        return `<span class="estado estado-${slug}">${UI.esc(estado)}</span>`;
    },

    kpi(etiqueta, valor, detalle, destacado) {
        return `
            <div class="kpi${destacado ? ' kpi-destacado' : ''}">
                <span>${etiqueta}</span>
                <strong>${valor}</strong>
                <small>${detalle || ''}</small>
            </div>`;
    },

    /* Listas compartidas por el panel y finanzas del emprendedor */
    listaVendidos(lista) {
        return lista.length
            ? `<div class="lista">${lista.slice(0, 5).map(v => `
                <div class="lista-fila">
                    <img src="${UI.esc(v.imagen)}" alt="">
                    <div class="crece"><strong>${UI.esc(v.nombre)}</strong><div class="texto-gris">${UI.dinero(v.ingresos)} en reservas entregadas</div></div>
                    <strong>${v.unidades} uds.</strong>
                </div>`).join('')}</div>`
            : '<p class="texto-gris">Aún no hay reservas entregadas.</p>';
    },

    listaInventarioBajo(lista) {
        return lista.length
            ? `<div class="lista">${lista.map(p => `
                <div class="lista-fila">
                    <img src="${UI.esc(p.imagen)}" alt="">
                    <div class="crece"><strong>${UI.esc(p.nombre)}</strong><div class="texto-gris">${p.activo ? 'Publicado' : 'Inactivo'}</div></div>
                    <span class="${p.stock === 0 ? 'problema' : ''}">${p.stock === 0 ? 'Agotado' : p.stock + ' uds.'}</span>
                    <a href="emprendedor-productos.html" class="enlace">Ajustar</a>
                </div>`).join('')}</div>`
            : `<p class="texto-gris">Ningún producto tiene ${Productos.STOCK_BAJO} unidades o menos.</p>`;
    },

    /* Tarjeta de reserva compartida por cliente y emprendedor */
    pedido(p, usuario) {
        const esVendedor = usuario.rol === 'emprendedor';
        const acciones = Pedidos.accionesPermitidas(p, usuario);
        const textos = { 'Aceptada': 'Aceptar', 'Rechazada': 'Rechazar', 'Entregada': 'Confirmar entrega', 'Cancelada': 'Cancelar reserva' };
        const peligro = ['Rechazada', 'Cancelada'];

        const items = p.items.map(i => `
            <div class="lista-fila">
                <img src="${UI.esc(i.imagen)}" alt="">
                <div class="crece">
                    <strong>${UI.esc(i.nombre)}</strong>
                    <div class="texto-gris">${i.cantidad} × ${UI.dinero(i.precio)}</div>
                </div>
                <strong>${UI.dinero(i.subtotal)}</strong>
            </div>`).join('');

        const historial = p.historial.map(h =>
            `<li>${UI.estado(h.estado)} ${UI.fecha(h.fecha)} · ${h.por === 'cliente' ? 'Cliente' : 'Negocio'}</li>`
        ).join('');

        return `
            <article class="pedido">
                <div class="pedido-cabecera">
                    <div>
                        <h3>Reserva ${UI.esc(p.codigo)}</h3>
                        <p class="texto-gris">${UI.fecha(p.creadoEn)} · ${esVendedor
                            ? 'Cliente: ' + UI.esc(p.comprador.nombre)
                            : 'Negocio: ' + UI.esc(p.vendedor.nombre)}</p>
                    </div>
                    ${UI.estado(p.estado)}
                </div>
                <div class="pedido-cuerpo">
                    <div>
                        <div class="lista">${items}</div>
                        <div class="resumen-fila resumen-total"><span>A pagar al recoger</span><span>${UI.dinero(p.total)}</span></div>
                    </div>
                    <div class="pedido-detalles">
                        <p><strong>Contacto:</strong> ${UI.esc(p.entrega.nombre)} · ${UI.esc(p.entrega.telefono)}</p>
                        <p><strong>Recoger en:</strong> ${UI.esc(p.vendedor.nombre)}${p.vendedor.direccion ? ', ' + UI.esc(p.vendedor.direccion) : ''}</p>
                        ${p.entrega.notas ? `<p><strong>Notas:</strong> ${UI.esc(p.entrega.notas)}</p>` : ''}
                        <details>
                            <summary>Historial de estados</summary>
                            <ul class="historial">${historial}</ul>
                        </details>
                    </div>
                </div>
                ${acciones.length ? `<div class="pedido-acciones">${acciones.map(a => `
                    <button type="button" class="boton boton-chico${peligro.includes(a) ? ' boton-peligro' : ''}"
                        data-accion="${a}" data-pedido="${p.id}">${textos[a]}</button>`).join('')}
                </div>` : ''}
            </article>`;
    },

    /* Conecta una sola vez los botones de estado (delegación de eventos) */
    conectarAccionesPedidos(contenedor, alCambiar) {
        contenedor.addEventListener('click', e => {
            const b = e.target.closest('[data-accion]');
            if (!b) return;
            const accion = b.dataset.accion;
            if (['Rechazada', 'Cancelada'].includes(accion) && !confirm('¿Confirmas? Las unidades volverán al inventario.')) return;
            const r = Pedidos.cambiarEstado(b.dataset.pedido, accion, Auth.actual());
            UI.toast(r.ok ? `Reserva actualizada: ${accion}` : r.mensaje, r.ok ? 'exito' : 'error');
            UI.renderHeader();
            alCambiar();
        });
    },

    /* ---------- formularios y avisos ---------- */

    mostrarErrores(form, errores) {
        form.querySelectorAll('[data-error]').forEach(el => { el.textContent = ''; });
        form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
        Object.entries(errores || {}).forEach(([campo, mensaje]) => {
            const el = form.querySelector(`[data-error="${campo}"]`);
            if (el) el.textContent = mensaje;
            const input = form.querySelector(`[name="${campo}"]`);
            if (input) input.setAttribute('aria-invalid', 'true');
        });
        const primero = form.querySelector('[aria-invalid="true"]');
        if (primero) primero.focus();
    },

    toast(mensaje, tipo) {
        const anterior = document.querySelector('.toast');
        if (anterior) anterior.remove();
        const t = document.createElement('div');
        t.className = 'toast' + (tipo ? ' toast-' + tipo : '');
        t.setAttribute('role', 'status');
        t.textContent = mensaje;
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 3500);
    }
};
