# Backend CV Argentina

Backend seguro para la aplicación de CV Argentina desarrollado con **Node.js**, **Express** y **PostgreSQL**.

## 🚀 Características

- ✅ **Autenticación JWT** - Sistema de autenticación y autorización seguro
- ✅ **PostgreSQL con Prisma** - Base de datos relacional moderna y fácil de usar
- ✅ **Validación robusta** - Validación server-side con express-validator
- ✅ **Integración Mercado Pago** - Procesamiento de pagos con webhooks
- ✅ **Upload de archivos** - Manejo seguro de fotos con Multer
- ✅ **Rate Limiting** - Protección contra ataques de fuerza bruta
- ✅ **Seguridad** - Helmet, CORS, bcrypt para passwords

## 📁 Estructura del Proyecto

```
backend/
├── prisma/
│   └── schema.prisma          # Schema de base de datos
├── src/
│   ├── middleware/
│   │   ├── auth.js            # Autenticación JWT
│   │   └── validation.js      # Validación de datos
│   ├── routes/
│   │   ├── auth.js            # Rutas de autenticación
│   │   ├── products.js        # CRUD de productos
│   │   ├── cart.js            # Gestión de carrito
│   │   ├── coupons.js         # Validación de cupones
│   │   ├── orders.js          # Gestión de órdenes
│   │   ├── payments.js        # Mercado Pago
│   │   ├── cvform.js          # Formularios CV
│   │   └── contact.js         # Mensajes de contacto
│   ├── scripts/
│   │   └── seed.js            # Datos iniciales
│   └── server.js              # Servidor Express
├── uploads/                   # Archivos subidos
├── .env.example               # Variables de entorno (ejemplo)
└── package.json
```

## 🛠️ Instalación

### 1. Instalar dependencias

```bash
cd backend
npm install
```

### 2. Configurar variables de entorno

Copia el archivo `.env.example` a `.env` y completa con tus datos:

```bash
cp .env.example .env
```

**Variables importantes:**

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `JWT_SECRET`: Clave secreta para JWT
- `MP_ACCESS_TOKEN`: Access token de Mercado Pago
- `FRONTEND_URL`: URL de tu frontend

### 3. Configurar base de datos PostgreSQL

**Opción A: Usar servicio en la nube (Recomendado)**

1. **Supabase** (https://supabase.com/):

   - Crear cuenta gratuita
   - Crear nuevo proyecto
   - Copiar la URL de conexión PostgreSQL
   - Pegarla en tu `.env` como `DATABASE_URL`

2. **Neon** (https://neon.tech/):
   - Similar a Supabase, muy fácil de usar
   - Plan gratuito generoso

**Opción B: PostgreSQL local**

```bash
# Instalar PostgreSQL localmente
# Windows: https://www.postgresql.org/download/windows/
# Luego crear base de datos:

createdb cvargentina_db
```

### 4. Inicializar base de datos

```bash
# Generar Prisma Client
npm run prisma:generate

# Crear tablas en la base de datos
npm run prisma:migrate

# Poblar con datos iniciales (productos, cupones, admin)
npm run db:seed
```

### 5. Crear carpeta de uploads

```bash
mkdir -p uploads/photos
```

## 🎯 Uso

### Modo desarrollo (con auto-reload)

```bash
npm run dev
```

### Modo producción

```bash
npm start
```

El servidor estará disponible en `http://localhost:3000`

## 📚 Rutas de la API

### Autenticación

- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `PUT /api/auth/update-profile` - Actualizar perfil

### Productos

- `GET /api/products` - Listar productos
- `GET /api/products/:id` - Obtener producto
- `POST /api/products` - Crear producto (admin)
- `PUT /api/products/:id` - Actualizar producto (admin)

### Carrito

- `GET /api/cart` - Obtener carrito
- `POST /api/cart/add` - Agregar producto
- `PUT /api/cart/update/:itemId` - Actualizar cantidad
- `DELETE /api/cart/remove/:itemId` - Eliminar item
- `DELETE /api/cart/clear` - Vaciar carrito

### Cupones

- `POST /api/coupons/validate` - Validar cupón
- `GET /api/coupons` - Listar cupones (admin)
- `POST /api/coupons` - Crear cupón (admin)

### Pagos

- `POST /api/payments/create-preference` - Crear preferencia de Mercado Pago
- `POST /api/payments/webhook` - Webhook de notificaciones
- `GET /api/payments/status/:orderId` - Estado de pago

### Órdenes

- `GET /api/orders` - Mis órdenes
- `GET /api/orders/:id` - Detalle de orden

### Formulario CV

- `POST /api/cvform/submit` - Enviar formulario
- `GET /api/cvform/submissions` - Mis submissions
- `GET /api/cvform/:id` - Detalle de submission

### Contacto

- `POST /api/contact` - Enviar mensaje

## 🔐 Autenticación

La API usa JWT (JSON Web Tokens). Para acceder a rutas protegidas:

1. Hacer login o registro
2. Obtener el token de la respuesta
3. Incluir en las siguientes peticiones:

```javascript
headers: {
  'Authorization': 'Bearer TU_TOKEN_AQUI'
}
```

## 🗄️ Gestión de Base de Datos

### Ver base de datos con Prisma Studio

```bash
npm run prisma:studio
```

Abre un navegador web con interfaz visual para ver/editar datos.

### Crear nueva migración

```bash
# Después de modificar schema.prisma
npx prisma migrate dev --name nombre_de_la_migracion
```

## 🚢 Deployment

### Opción 1: Railway (Recomendado)

1. Crear cuenta en https://railway.app/
2. Crear nuevo proyecto
3. Conectar repositorio GitHub
4. Railway detectará automáticamente Node.js
5. Agregar servicio PostgreSQL
6. Configurar variables de entorno en el dashboard
7. Deploy automático ✨

### Opción 2: Render

1. Crear cuenta en https://render.com/
2. Crear Web Service desde GitHub
3. Configurar:
   - Build Command: `npm install && npx prisma generate && npx prisma migrate deploy`
   - Start Command: `npm start`
4. Agregar PostgreSQL desde dashboard
5. Configurar variables de entorno

### Variables de entorno para producción

No olvides configurar:

- `NODE_ENV=production`
- `DATABASE_URL` (proporcionada por Railway/Render)
- `JWT_SECRET` (generar nueva clave segura)
- `MP_ACCESS_TOKEN`
- `FRONTEND_URL` (URL de tu frontend desplegado)

## 🧪 Testing

```bash
# Probar health check
curl http://localhost:3000/health

# Ejemplo de registro
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","fullName":"Test User"}'
```

## 📝 Datos de Prueba

Después de ejecutar el seed, puedes usar:

**Usuario Admin:**

- Email: `admin@cvargentina.com`
- Password: `admin123`

**Cupones disponibles:**

- `DESPEGAR10` - 10% OFF
- `CVPRO` - 20% OFF
- `STUDENT` - 15% OFF

## 🔧 Troubleshooting

### Error de conexión a BD

```bash
# Verificar que la URL de BD es correcta
npx prisma db push

# Ver logs de PostgreSQL
```

### Error con Prisma Client

```bash
# Regenerar Prisma Client
npx prisma generate
```

### Puerto en uso

```bash
# Cambiar PORT en .env
PORT=3001
```

## 📞 Soporte

Para problemas o preguntas, contactar a: **Ing. Rodriguez**

---

**Desarrollado con ❤️ para CV Argentina**
