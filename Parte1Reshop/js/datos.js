'use strict';
/* =====================================================
   RESHOP · CAPA DE DATOS
   Todo el acceso a LocalStorage pasa por este archivo.
   Emprendedores y clientes comparten las mismas colecciones.

   ⚠️ PROTOTIPO: la autenticación es demostrativa.
   Los datos viven solo en este navegador y NO son seguros
   para producción.
   ===================================================== */


/* ================= ALMACENAMIENTO ================= */

const Store = {
    prefijo: 'reshop_',

    leer(clave, porDefecto) {
        try {
            const valor = localStorage.getItem(this.prefijo + clave);
            return valor === null ? porDefecto : JSON.parse(valor);
        } catch (e) {
            return porDefecto;
        }
    },

    guardar(clave, valor) {
        try {
            localStorage.setItem(this.prefijo + clave, JSON.stringify(valor));
        } catch (e) {
            throw new Error(e && e.name === 'QuotaExceededError'
                ? 'El almacenamiento del navegador está lleno. Prueba con una imagen más pequeña.'
                : 'No se pudo guardar la información.');
        }
    },

    borrar(clave) {
        localStorage.removeItem(this.prefijo + clave);
    }
};


/* ================= UTILIDADES ================= */

function generarId(prefijo) {
    let azar;
    try {
        azar = crypto.randomUUID().replace(/-/g, '');
    } catch (e) {
        azar = Date.now().toString(36) + Math.random().toString(36).slice(2);
    }
    return prefijo + '_' + azar.slice(0, 14);
}

function redondear(n) {
    return Math.round(Number(n) * 100) / 100;
}

function ahoraISO() {
    return new Date().toISOString();
}

function tieneErrores(errores) {
    return Object.keys(errores).length > 0;
}

const Validar = {
    texto(v, min, max) {
        const t = String(v == null ? '' : v).trim();
        return t.length >= min && t.length <= max;
    },
    email(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim());
    },
    telefono(v) {
        return /^[0-9+\-\s]{8,15}$/.test(String(v || '').trim());
    }
};


/* ================= CATÁLOGOS FIJOS ================= */

const CATEGORIAS = [
    { id: 'panaderia', nombre: 'Panadería', imagen: 'img/categoria-panaderia.png' },
    { id: 'postres', nombre: 'Postres', imagen: 'img/categoria-postres.png' },
    { id: 'comida', nombre: 'Comida', imagen: 'img/categoria-comida.png' },
    { id: 'bebidas', nombre: 'Bebidas', imagen: 'img/categoria-bebidas.png' }
];

/* Imágenes del proyecto que el emprendedor puede elegir */
const GALERIA_IMAGENES = [
    'img/brownies.png', 'img/croissant.png', 'img/cupcakes.png', 'img/chocos.png',
    'img/banderillas.png', 'img/pupusas.png', 'img/pan.png'
];

function nombreCategoria(id) {
    const c = CATEGORIAS.find(c => c.id === id);
    return c ? c.nombre : 'Sin categoría';
}


/* ================= USUARIOS Y SESIÓN ================= */

const Auth = {
    ROLES: ['cliente', 'emprendedor'],

    /* Hash NO criptográfico: solo evita guardar la contraseña en texto plano en la demo */
    _hash(texto) {
        let h = 5381;
        for (const c of texto) h = ((h << 5) + h + c.codePointAt(0)) >>> 0;
        return 'demo$' + h.toString(16);
    },

    usuarios() {
        return Store.leer('usuarios', []);
    },

    porId(id) {
        return this.usuarios().find(u => u.id === id) || null;
    },

    /* Copia del usuario sin el hash de la contraseña */
    publico(u) {
        if (!u) return null;
        const copia = Object.assign({}, u);
        delete copia.passwordHash;
        return copia;
    },

    nombreNegocio(sellerId) {
        const u = this.porId(sellerId);
        return u && u.negocio ? u.negocio.nombre : 'Negocio';
    },

    validarRegistro(d) {
        const e = {};
        if (!this.ROLES.includes(d.rol)) e.rol = 'Elige un tipo de cuenta.';
        if (!Validar.texto(d.nombre, 2, 60)) e.nombre = 'Escribe tu nombre (2 a 60 caracteres).';
        if (!Validar.email(d.email)) {
            e.email = 'Escribe un correo válido.';
        } else if (this.usuarios().some(u => u.email === d.email.trim().toLowerCase())) {
            e.email = 'Ya existe una cuenta con este correo.';
        }
        if (String(d.password || '').length < 6) e.password = 'La contraseña debe tener al menos 6 caracteres.';
        if (d.password !== d.confirmar) e.confirmar = 'Las contraseñas no coinciden.';
        if (d.rol === 'emprendedor') {
            if (!Validar.texto(d.negocio, 2, 60)) e.negocio = 'Escribe el nombre de tu negocio.';
            if (!Validar.texto(d.direccion, 5, 120)) e.direccion = 'Escribe la dirección de tu negocio.';
        }
        return e;
    },

    registrar(d) {
        const errores = this.validarRegistro(d);
        if (tieneErrores(errores)) return { ok: false, errores };

        const email = d.email.trim().toLowerCase();
        const usuario = {
            id: generarId('usr'),
            rol: d.rol,
            nombre: d.nombre.trim(),
            email,
            passwordHash: this._hash(email + ':' + d.password),
            creadoEn: ahoraISO()
        };
        if (d.rol === 'emprendedor') {
            usuario.negocio = { nombre: d.negocio.trim(), direccion: d.direccion.trim() };
        }

        Store.guardar('usuarios', this.usuarios().concat(usuario));
        this._abrirSesion(usuario);
        return { ok: true, usuario: this.publico(usuario) };
    },

    iniciarSesion(email, password) {
        const e = {};
        if (!Validar.email(email)) e.email = 'Escribe un correo válido.';
        if (!password) e.password = 'Escribe tu contraseña.';
        if (tieneErrores(e)) return { ok: false, errores: e };

        const correo = email.trim().toLowerCase();
        const u = this.usuarios().find(x => x.email === correo);
        if (!u || u.passwordHash !== this._hash(correo + ':' + password)) {
            return { ok: false, errores: { general: 'Correo o contraseña incorrectos.' } };
        }
        this._abrirSesion(u);
        return { ok: true, usuario: this.publico(u) };
    },

    _abrirSesion(u) {
        Store.guardar('sesion', { usuarioId: u.id, inicio: ahoraISO() });
    },

    cerrarSesion() {
        Store.borrar('sesion');
    },

    actual() {
        const s = Store.leer('sesion', null);
        if (!s) return null;
        const u = this.porId(s.usuarioId);
        if (!u) {
            this.cerrarSesion();
            return null;
        }
        return this.publico(u);
    },

    inicioDeRol(rol) {
        if (rol === 'emprendedor') return 'emprendedor-panel.html';
        if (rol === 'cliente') return 'explorar.html';
        return 'index.html';
    }
};


/* ================= PRODUCTOS ================= */

const Productos = {
    STOCK_BAJO: 3,

    todos() {
        return Store.leer('productos', []);
    },

    porId(id) {
        return this.todos().find(p => p.id === id) || null;
    },

    deVendedor(sellerId) {
        return this.todos().filter(p => p.sellerId === sellerId);
    },

    /* Lo que ve el cliente: productos activos de emprendedores existentes */
    publicados() {
        const vendedores = new Set(Auth.usuarios().filter(u => u.rol === 'emprendedor').map(u => u.id));
        return this.todos().filter(p => p.activo && vendedores.has(p.sellerId));
    },

    validar(d) {
        const e = {};
        if (!Validar.texto(d.nombre, 3, 60)) e.nombre = 'El nombre debe tener entre 3 y 60 caracteres.';
        if (!Validar.texto(d.descripcion, 10, 300)) e.descripcion = 'La descripción debe tener entre 10 y 300 caracteres.';
        if (!CATEGORIAS.some(c => c.id === d.categoria)) e.categoria = 'Elige una categoría.';

        const precio = Number(d.precio);
        if (d.precio === '' || !(precio > 0) || precio > 10000) e.precio = 'Escribe un precio mayor que 0.';

        if (d.precioOriginal !== '' && d.precioOriginal != null) {
            if (!(Number(d.precioOriginal) > precio)) e.precioOriginal = 'Debe ser mayor que el precio de rescate (o déjalo vacío).';
        }

        const stock = Number(d.stock);
        if (d.stock === '' || !Number.isInteger(stock) || stock < 0 || stock > 9999) {
            e.stock = 'El inventario debe ser un número entero entre 0 y 9999.';
        }
        if (!d.imagen) e.imagen = 'Selecciona o sube una imagen.';
        if (d.disponibleHasta && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d.disponibleHasta)) e.disponibleHasta = 'Hora no válida.';
        return e;
    },

    _normalizar(d) {
        const vacio = d.precioOriginal === '' || d.precioOriginal == null;
        return {
            nombre: d.nombre.trim(),
            descripcion: d.descripcion.trim(),
            categoria: d.categoria,
            precio: redondear(d.precio),
            precioOriginal: vacio ? null : redondear(d.precioOriginal),
            stock: Number(d.stock),
            imagen: d.imagen,
            disponibleHasta: d.disponibleHasta || '',
            activo: d.activo === true || d.activo === 'on' || d.activo === 'true'
        };
    },

    /* Crea (sin id) o edita (con id) un producto del vendedor */
    guardar(sellerId, d, id) {
        const errores = this.validar(d);
        if (tieneErrores(errores)) return { ok: false, errores };

        const lista = this.todos();
        const ahora = ahoraISO();

        if (id) {
            const i = lista.findIndex(p => p.id === id);
            if (i < 0 || lista[i].sellerId !== sellerId) {
                return { ok: false, errores: { general: 'No tienes permiso para editar este producto.' } };
            }
            lista[i] = Object.assign({}, lista[i], this._normalizar(d), { actualizadoEn: ahora });
            Store.guardar('productos', lista);
            return { ok: true, producto: lista[i] };
        }

        const producto = Object.assign(
            { id: generarId('prd'), sellerId },
            this._normalizar(d),
            { creadoEn: ahora, actualizadoEn: ahora }
        );
        Store.guardar('productos', lista.concat(producto));
        return { ok: true, producto };
    },

    _modificarPropio(id, sellerId, cambio) {
        const lista = this.todos();
        const p = lista.find(x => x.id === id);
        if (!p || p.sellerId !== sellerId) return { ok: false, mensaje: 'No tienes permiso sobre este producto.' };
        const error = cambio(p);
        if (error) return { ok: false, mensaje: error };
        p.actualizadoEn = ahoraISO();
        Store.guardar('productos', lista);
        return { ok: true, producto: p };
    },

    alternarActivo(id, sellerId) {
        return this._modificarPropio(id, sellerId, p => { p.activo = !p.activo; });
    },

    ajustarStock(id, sellerId, valor) {
        const stock = Number(valor);
        return this._modificarPropio(id, sellerId, p => {
            if (valor === '' || !Number.isInteger(stock) || stock < 0 || stock > 9999) {
                return 'El inventario debe ser un número entero entre 0 y 9999.';
            }
            p.stock = stock;
        });
    },

    eliminar(id, sellerId) {
        const lista = this.todos();
        const p = lista.find(x => x.id === id);
        if (!p || p.sellerId !== sellerId) return { ok: false, mensaje: 'No tienes permiso sobre este producto.' };
        Store.guardar('productos', lista.filter(x => x.id !== id));
        Favoritos.quitar(id);
        return { ok: true };
    }
};


/* ================= FAVORITOS (de este navegador) ================= */

const Favoritos = {
    lista() {
        return Store.leer('favoritos', []);
    },
    tiene(id) {
        return this.lista().includes(id);
    },
    alternar(id) {
        const l = this.lista();
        const nueva = l.includes(id) ? l.filter(x => x !== id) : l.concat(id);
        Store.guardar('favoritos', nueva);
        return nueva.includes(id);
    },
    quitar(id) {
        Store.guardar('favoritos', this.lista().filter(x => x !== id));
    }
};


/* ================= RESERVAS (sin pago) ================= */

const Pedidos = {
    ESTADOS: ['Pendiente', 'Aceptada', 'Entregada', 'Rechazada', 'Cancelada'],

    /* Acciones del emprendedor según el estado */
    TRANSICIONES: {
        'Pendiente': ['Aceptada', 'Rechazada'],
        'Aceptada': ['Entregada', 'Rechazada'],
        'Entregada': [],
        'Rechazada': [],
        'Cancelada': []
    },

    todos() {
        return Store.leer('reservas', []);
    },

    porId(id) {
        return this.todos().find(p => p.id === id) || null;
    },

    _ordenar(lista) {
        return lista.sort((a, b) => b.creadoEn.localeCompare(a.creadoEn));
    },

    delComprador(buyerId) {
        return this._ordenar(this.todos().filter(p => p.buyerId === buyerId));
    },

    delVendedor(sellerId) {
        return this._ordenar(this.todos().filter(p => p.sellerId === sellerId));
    },

    _codigo(existentes) {
        let codigo;
        do {
            codigo = 'RS-' + Math.random().toString(36).slice(2, 7).toUpperCase();
        } while (existentes.some(p => p.codigo === codigo));
        return codigo;
    },

    /* Crea una reserva y aparta las unidades del inventario */
    reservar(cliente, productId, datos) {
        if (!cliente || cliente.rol !== 'cliente') return { ok: false, errores: { general: 'Inicia sesión como cliente para reservar.' } };

        const productos = Productos.todos();
        const p = productos.find(x => x.id === productId);
        if (!p || !p.activo) return { ok: false, errores: { general: 'Este producto ya no está disponible.' } };

        const e = {};
        const cantidad = Number(datos.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1) e.cantidad = 'Cantidad no válida.';
        else if (cantidad > p.stock) e.cantidad = p.stock ? `Solo hay ${p.stock} unidades disponibles.` : 'Producto agotado.';
        if (!Validar.telefono(datos.telefono)) e.telefono = 'Escribe un teléfono válido (8 a 15 dígitos).';
        if (String(datos.notas || '').length > 200) e.notas = 'Máximo 200 caracteres.';
        if (tieneErrores(e)) return { ok: false, errores: e };

        const existentes = this.todos();
        if (existentes.some(r => r.buyerId === cliente.id && r.estado === 'Pendiente' && r.items[0].productId === productId)) {
            return { ok: false, errores: { general: 'Ya tienes una reserva pendiente de este producto.' } };
        }

        const vendedor = Auth.porId(p.sellerId);
        const ahora = ahoraISO();
        const reserva = {
            id: generarId('res'),
            codigo: this._codigo(existentes),
            buyerId: cliente.id,
            comprador: { nombre: cliente.nombre, email: cliente.email },
            sellerId: p.sellerId,
            vendedor: {
                nombre: vendedor && vendedor.negocio ? vendedor.negocio.nombre : 'Negocio',
                direccion: vendedor && vendedor.negocio ? vendedor.negocio.direccion : ''
            },
            items: [{
                productId: p.id, nombre: p.nombre, imagen: p.imagen, categoria: p.categoria,
                precio: p.precio, precioOriginal: p.precioOriginal, cantidad,
                subtotal: redondear(p.precio * cantidad)
            }],
            total: redondear(p.precio * cantidad),
            entrega: { nombre: cliente.nombre, telefono: datos.telefono.trim(), notas: String(datos.notas || '').trim() },
            estado: 'Pendiente',
            historial: [{ estado: 'Pendiente', fecha: ahora, por: 'cliente' }],
            creadoEn: ahora,
            actualizadoEn: ahora
        };

        p.stock -= cantidad;
        Store.guardar('productos', productos);
        Store.guardar('reservas', existentes.concat(reserva));
        return { ok: true, reserva };
    },

    accionesPermitidas(reserva, usuario) {
        if (!usuario) return [];
        if (usuario.rol === 'emprendedor' && reserva.sellerId === usuario.id) {
            return this.TRANSICIONES[reserva.estado] || [];
        }
        if (usuario.rol === 'cliente' && reserva.buyerId === usuario.id && ['Pendiente', 'Aceptada'].includes(reserva.estado)) {
            return ['Cancelada'];
        }
        return [];
    },

    cambiarEstado(id, nuevo, usuario) {
        const lista = this.todos();
        const reserva = lista.find(p => p.id === id);
        if (!reserva) return { ok: false, mensaje: 'La reserva no existe.' };
        if (!this.accionesPermitidas(reserva, usuario).includes(nuevo)) {
            return { ok: false, mensaje: `No se puede cambiar de "${reserva.estado}" a "${nuevo}".` };
        }

        const ahora = ahoraISO();
        reserva.estado = nuevo;
        reserva.actualizadoEn = ahora;
        reserva.historial.push({ estado: nuevo, fecha: ahora, por: usuario.rol });

        /* Rechazar o cancelar devuelve las unidades al inventario */
        if (nuevo === 'Rechazada' || nuevo === 'Cancelada') {
            const productos = Productos.todos();
            reserva.items.forEach(i => {
                const p = productos.find(x => x.id === i.productId);
                if (p) p.stock += i.cantidad;
            });
            Store.guardar('productos', productos);
        }

        Store.guardar('reservas', lista);
        return { ok: true, reserva };
    },

    /* Ranking de productos según reservas ENTREGADAS */
    masVendidos(sellerId) {
        const acc = {};
        this.todos()
            .filter(p => p.estado === 'Entregada' && (!sellerId || p.sellerId === sellerId))
            .forEach(p => p.items.forEach(i => {
                const r = acc[i.productId] = acc[i.productId] ||
                    { productId: i.productId, nombre: i.nombre, imagen: i.imagen, unidades: 0, ingresos: 0 };
                r.unidades += i.cantidad;
                r.ingresos = redondear(r.ingresos + i.subtotal);
            }));
        return Object.values(acc).sort((a, b) => b.unidades - a.unidades || b.ingresos - a.ingresos);
    },

    /* Indicadores del panel del emprendedor */
    resumen(sellerId) {
        const reservas = this.delVendedor(sellerId);
        const productos = Productos.deVendedor(sellerId);
        const contar = estados => reservas.filter(p => estados.includes(p.estado)).length;
        const activos = productos.filter(p => p.activo);
        const entregadas = reservas.filter(p => p.estado === 'Entregada');

        return {
            totalReservas: reservas.length,
            pendientes: contar(['Pendiente']),
            aceptadas: contar(['Aceptada']),
            completadas: entregadas.length,
            unidadesEntregadas: entregadas.reduce((s, p) => s + p.items.reduce((a, i) => a + i.cantidad, 0), 0),
            totalProductos: productos.length,
            publicados: activos.length,
            inventario: activos.reduce((s, p) => s + p.stock, 0),
            inventarioBajo: productos.filter(p => p.stock <= Productos.STOCK_BAJO).sort((a, b) => a.stock - b.stock),
            masVendidos: this.masVendidos(sellerId),
            recientes: reservas.slice(0, 5)
        };
    },

    /* Impacto global calculado con reservas entregadas */
    impacto() {
        const entregadas = this.todos().filter(p => p.estado === 'Entregada');
        const items = entregadas.flatMap(p => p.items);
        return {
            rescatados: items.reduce((s, i) => s + i.cantidad, 0),
            ahorro: redondear(items.reduce((s, i) => s + (i.precioOriginal ? (i.precioOriginal - i.precio) * i.cantidad : 0), 0)),
            negocios: Auth.usuarios().filter(u => u.rol === 'emprendedor').length,
            completadas: entregadas.length
        };
    }
};


/* ================= DATOS DE EJEMPLO =================
   Se leen de data/ejemplos.json (una sola vez) y se copian a LocalStorage.
   Requiere abrir el proyecto con un servidor local (Live Server):
   el navegador bloquea fetch() con archivos abiertos por doble clic. */

const Datos = {
    listo: (async function cargarEjemplos() {
        if (Store.leer('ejemplos_cargados', false)) return;
        try {
            const respuesta = await fetch('data/ejemplos.json');
            const ejemplos = await respuesta.json();
            const ahora = ahoraISO();
            const usuarios = Auth.usuarios();
            const productos = Productos.todos();

            ejemplos.negocios.forEach(n => {
                if (usuarios.some(u => u.email === n.email)) return;
                usuarios.push({
                    id: n.id, rol: 'emprendedor', nombre: n.nombre, email: n.email,
                    passwordHash: Auth._hash(n.email + ':' + n.password),
                    negocio: { nombre: n.nombre, direccion: n.direccion }, creadoEn: ahora
                });
            });
            ejemplos.productos.forEach(p => {
                if (productos.some(x => x.id === p.id)) return;
                productos.push(Object.assign({}, p, { creadoEn: ahora, actualizadoEn: ahora }));
            });

            Store.guardar('usuarios', usuarios);
            Store.guardar('productos', productos);
            Store.guardar('ejemplos_cargados', true);
        } catch (e) {
            console.warn('No se pudo leer data/ejemplos.json. Abre el proyecto con Live Server.', e);
        }
    })()
};
