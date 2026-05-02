# 🔐 Security Guidelines

## 🔑 Authentication

- JWT tokens
- Refresh tokens
- Expiry handling

---

## 🛡️ Backend Security

- Input validation (Joi / Zod)
- SQL injection prevention
- Rate limiting

---

## ⚡ WebSocket Security

- Authenticate before joining game
- Validate all moves on server
- Prevent fake moves

---

## ♟️ Anti-Cheating

- Server validates moves using chess.js
- No client-side trust
- Detect impossible moves

---

## 📦 Database Security

- Use parameterized queries
- Hash passwords (bcrypt)

---

## 🚨 Protection

- DDOS protection (basic)
- Request throttling

---

## 🔐 Best Practices

- Never trust frontend
- Log suspicious activity