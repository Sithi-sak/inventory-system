# Inventory Management System

A modern, full-stack inventory management system built with Next.js, TypeScript, Prisma, and PostgreSQL. Designed for small to medium businesses to track products, customers, orders, and generate comprehensive reports.

## 🚀 Features

### Core Functionality
- **Product Management** - Add, edit, and track products with pricing
- **Customer Management** - Customer database with contact info and order history
- **Inventory Tracking** - Multi-location stock management with movement history
- **Order Processing** - Complete order lifecycle from pending to delivered
- **Reports & Analytics** - Monthly business reports with export functionality

### Advanced Features
- **Stock Movements** - Production, transfers, adjustments, and sales tracking
- **Order Status Management** - Pending, delivered, on-hold, canceled with reasons
- **Multi-location Support** - Warehouse, production, delivery service locations
- **Data Export** - CSV reports for business analysis
- **Responsive Design** - Works on desktop, tablet, and mobile

## 🛠️ Tech Stack

- **Frontend:** Next.js 15, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Prisma ORM
- **Database:** PostgreSQL
- **UI Components:** Radix UI, Lucide Icons
- **Charts:** Recharts
- **Authentication:** Custom authentication system
- **Deployment:** Vercel

## 📋 Prerequisites

- Node.js 18+ 
- PostgreSQL database
- pnpm (recommended) or npm

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd inventory-system
```

### 2. Install Dependencies
```bash
pnpm install
```

### 3. Environment Setup
Create a `.env` file in the root directory:
```bash
DATABASE_URL="postgresql://username:password@localhost:5432/inventory_db"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Database Setup
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed initial data
npm run seed
```

### 5. Start Development Server
```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the application.

## 🗄️ Database Schema

### Core Models
- **Customer** - Customer information and contact details
- **Product** - Product catalog with pricing
- **Order** - Customer orders with status tracking
- **InventoryLocation** - Warehouse/storage locations
- **StockMovement** - All inventory movements and transfers
- **InventoryItem** - Current stock levels per location

### Key Relationships
- Customers have multiple Orders
- Orders contain multiple OrderItems (products)
- Products exist in multiple InventoryLocations
- StockMovements track all inventory changes

## 🔧 Deployment

### Vercel Deployment

1. **Create Vercel Project**
   - Connect your GitHub repository
   - Import the project to Vercel

2. **Add Vercel Postgres**
   - Go to Storage tab in Vercel dashboard
   - Create a Postgres database
   - Copy the DATABASE_URL

3. **Configure Environment Variables**
   ```bash
   DATABASE_URL=<vercel-postgres-url>
   NEXTAUTH_SECRET=<random-secret-key>
   NEXTAUTH_URL=https://your-app.vercel.app
   ```

4. **Deploy & Setup Database**
   ```bash
   # Deploy the app
   vercel --prod
   
   # Run migrations
   npx prisma migrate deploy
   ```

5. **Seed Initial Data**
   Visit these URLs after deployment:
   - `https://your-app.vercel.app/api/auth/seed-admin`
   - `https://your-app.vercel.app/api/inventory/seed-locations`

## 📱 Usage

### First Time Setup
1. **Seed Admin User** - Visit `/api/auth/seed-admin`
2. **Seed Locations** - Visit `/api/inventory/seed-locations`
3. **Login** - Default credentials: admin/admin123
4. **Add Products** - Start adding your product catalog
5. **Add Customers** - Build your customer database

### Daily Operations
- **Process Orders** - Add new orders and track status
- **Update Inventory** - Record stock movements and transfers
- **Generate Reports** - Monthly business analytics and exports

## 🔐 Authentication

- **Default Admin Login:** `admin` / `admin123`
- **Change Password:** Available in Settings after first login
- **Session Management:** Secure session-based authentication

## 📊 API Endpoints

### Products
- `GET /api/products` - List all products
- `POST /api/products` - Create new product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### Customers
- `GET /api/customers` - List all customers
- `POST /api/customers` - Create customer
- `PUT /api/customers/[id]` - Update customer

### Orders
- `GET /api/dashboard/orders` - List orders
- `POST /api/customers/[id]/orders/[orderId]/status` - Update order status

### Inventory
- `GET /api/inventory` - Get inventory levels
- `POST /api/inventory/stock-movement` - Record stock movement
- `GET /api/inventory/[productId]/history` - Stock movement history

### Reports
- `GET /api/reports` - Generate monthly reports

## 🧪 Testing

```bash
# Run type checking
pnpm type-check

# Run linting
pnpm lint

# Build for production
pnpm build
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── dashboard/         # Main application pages
│   └── login/            # Authentication
├── components/            # React components
│   ├── ui/               # Base UI components
│   └── ...               # Feature components
├── lib/                  # Utilities and configurations
└── generated/prisma/     # Generated Prisma client

prisma/
└── schema.prisma         # Database schema
```

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Secret for session encryption
- `NEXTAUTH_URL` - Application URL for callbacks

### Database Configuration
- Uses Prisma ORM for database management
- PostgreSQL with optimized indexes
- Automatic timestamp tracking
- Data validation at database level

## 🐛 Troubleshooting

### Common Issues

**Build Errors:**
```bash
# Clear Next.js cache
rm -rf .next
pnpm build
```

**Database Connection:**
```bash
# Test database connection
npx prisma db pull
```

**Missing Dependencies:**
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

## 📄 License

This project is proprietary software. All rights reserved.

## 🤝 Support

For support or questions about this inventory management system, please contact the development team.

---

**Built with ❤️ for efficient inventory management**