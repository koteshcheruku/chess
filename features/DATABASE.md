
```md
# 🗄️ Database Schema (PostgreSQL)

## Users

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT,
  rating INT DEFAULT 1200,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);