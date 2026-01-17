# Shop Profile

Landing page HTML/CSS/JS + backend Flask chạy trên Vercel. Dữ liệu lấy từ Postgres (Supabase) và ảnh lưu ở Supabase Storage.

## Công nghệ sử dụng
- Frontend: HTML/CSS/JS thuần (index.html, styles.css, main.js)
- Backend: Flask (api/index.py + app.py)
- Database: PostgreSQL (Supabase)
- Storage: Supabase Storage (uploads)
- Deploy: Vercel

## Trước khi pull code
1) Cài Git và Node.js (để chạy Vercel CLI khi cần).
2) Cài Python 3.11 hoặc 3.12 (khuyến nghị 3.12).
3) Chuẩn bị thông tin Supabase (URL, Service Role Key, Database URL).

## Tạo môi trường & chạy local
1) Tạo môi trường ảo và kích hoạt.
2) Cài dependencies từ requirements.txt.
3) Tạo file .env từ mẫu bên dưới.
4) Chạy server Flask và mở http://localhost:5500.

### Mẫu .env
```
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_STORAGE_BUCKET=uploads
```

## Ghi chú
- Vercel dev trên Windows có thể lỗi với @vercel/python. Nên dùng WSL2 hoặc Docker nếu cần chạy vercel dev.
- Ảnh sản phẩm upload qua Supabase Storage và đã được nén/resize ở client.
