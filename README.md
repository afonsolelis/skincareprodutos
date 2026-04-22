# SkinCareFriends

Vitrine de skincare com painel admin (cadastro/edição/remoção de produtos), imagens hospedadas no Cloudinary e dados em MongoDB.

## Stack

- Node.js 18+ / Express
- MongoDB (Mongoose)
- Cloudinary (upload direto via multer)
- Sessão simples (`express-session`) com credenciais fixas via `.env`
- Front estático servido de `public/` (Tailwind via CDN)

## Rodar localmente

```bash
npm install
# copie .env.example para .env e ajuste MONGODB_URI / SESSION_SECRET
npm start
```

Acesse:

- `http://localhost:3000` — vitrine pública
- `http://localhost:3000/login` — login do painel
- `http://localhost:3000/admin` — painel (exige login)

## Variáveis de ambiente (`.env`)

| Variável                | Descrição                                                      |
| ----------------------- | -------------------------------------------------------------- |
| `PORT`                  | Porta HTTP (Railway injeta automaticamente)                    |
| `NODE_ENV`              | `production` em deploy                                         |
| `ADMIN_USER`            | Usuário do painel                                              |
| `ADMIN_PASS`            | Senha do painel                                                |
| `SESSION_SECRET`        | String aleatória longa (troque em produção)                    |
| `MONGODB_URI`           | Connection string do Mongo (Railway plugin ou Atlas)           |
| `CLOUDINARY_CLOUD_NAME` | `dyhjjms8y`                                                    |
| `CLOUDINARY_API_KEY`    | API key                                                        |
| `CLOUDINARY_API_SECRET` | API secret                                                     |
| `CLOUDINARY_FOLDER`     | Pasta destino (default `skincarefriends`)                      |

## Deploy no Railway

1. `railway init` (ou conecte o repo no dashboard).
2. Adicione o plugin **MongoDB** — a var `MONGO_URL` aparece automaticamente. Crie uma variável `MONGODB_URI` com o mesmo valor (`${{ MongoDB.MONGO_URL }}`).
3. Copie todas as variáveis de `.env.example` para o serviço no Railway (Variables).
4. Railway detecta `railway.json` / `Procfile` e roda `node server.js`.
5. Healthcheck em `/healthz`.

## Rotas

Públicas:
- `GET  /`                    vitrine
- `GET  /api/products`        lista produtos
- `GET  /api/products/:id`    detalhe

Auth:
- `POST /api/auth/login`      `{ username, password }`
- `POST /api/auth/logout`
- `GET  /api/auth/me`

Admin (sessão obrigatória):
- `POST   /api/products`        multipart: `name`, `description`, `price?`, `image`
- `PUT    /api/products/:id`    multipart, `image` opcional
- `DELETE /api/products/:id`    remove + apaga do Cloudinary

## Estrutura

```
.
├── server.js
├── models/Product.js
├── config/cloudinary.js
├── middleware/auth.js
├── public/
│   ├── index.html     # vitrine
│   ├── login.html
│   └── admin.html
├── .env / .env.example
├── Procfile
└── railway.json
```
