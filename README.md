# API Registro de Donantes

Módulo de registro de personas donantes con autenticación JWT, roles (admin/usuario),
pruebas con Jest (cobertura ≥ 80 %) y pipeline CI/CD en GitHub Actions.

## Requisitos
- Node.js 22.5 o superior (usa el módulo integrado `node:sqlite`)

## Uso
```bash
npm install
npm test        # pruebas + reporte de cobertura
npm start       # http://localhost:3000
```

Admin por defecto: `admin@donantes.org` / `Admin123!` (cambiar con `ADMIN_EMAIL` / `ADMIN_PASSWORD`).
Variables: `PORT`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `DB_FILE` (por defecto en memoria).

## Endpoints
| Método | Ruta | Rol |
|---|---|---|
| POST | /api/auth/registro | público (crea rol `usuario`) |
| POST | /api/auth/login | público (devuelve JWT) |
| PATCH | /api/auth/usuarios/:id/rol | admin |
| POST | /api/donantes | admin, usuario |
| GET | /api/donantes?buscar= | admin (todos), usuario (solo los suyos) |
| GET | /api/donantes/:id | admin, usuario dueño |
| PUT | /api/donantes/:id | admin |
| DELETE | /api/donantes/:id | admin |

## Seguridad
- Contraseñas con bcrypt, JWT firmado con expiración.
- Sentencias preparadas en todas las consultas (anti SQLi).
- Sanitización de texto y validación de entrada (anti XSS).
- Cabeceras de seguridad con helmet, límite de 10 kb en el body, errores 500 sin detalles.

## CI/CD (`.github/workflows/ci-cd.yml`)
1. **test**: `npm ci` + `npm test` (falla si la cobertura < 80 %) + análisis SonarQube.
2. **security**: levanta la API en Docker y ejecuta OWASP ZAP API Scan con `openapi.json`.
3. **deploy**: en push a `main`, publica la imagen en GHCR y dispara el despliegue a staging.

Secretos a configurar en GitHub: `SONAR_TOKEN`, `SONAR_HOST_URL`, `RENDER_DEPLOY_HOOK`.

## SonarQube local
```bash
docker run -d -p 9000:9000 sonarqube:community
npm test
npx sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.token=TU_TOKEN
```

## OWASP ZAP local
```bash
docker run --rm -t --network host ghcr.io/zaproxy/zaproxy:stable zap-api-scan.py -t http://localhost:3000/openapi.json -f openapi -r zap-report.html
```
