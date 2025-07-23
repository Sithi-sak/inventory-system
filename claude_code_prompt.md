# Fix Vercel Build Errors - ESLint Issues

The Vercel deployment is failing due to ESLint errors. Please fix the following issues systematically:

## Priority 1: Fix Application Code Errors (Non-Prisma Files)

### 1. Fix Unescaped Entities in JSX
Replace unescaped quotes and apostrophes in these files:
- `src/app/dashboard/settings/page.tsx` (line 195)
- `src/components/add-customer-modal.tsx` (line 214)
- `src/components/add-product-modal.tsx` (line 76)
- `src/components/cancellation-reason-modal.tsx` (lines 66, 113)
- `src/components/edit-customer-modal.tsx` (line 228)
- `src/components/edit-product-modal.tsx` (line 86)

Replace:
- `'` with `&apos;` or `&#39;`
- `"` with `&quot;` or `&#34;`

### 2. Fix TypeScript `any` Types
Replace explicit `any` types with proper TypeScript types in:
- `src/app/api/customers/[id]/orders/[orderId]/status/route.ts` (lines 124, 188)
- `src/app/api/customers/[id]/route.ts` (lines 49, 61)
- `src/app/api/customers/route.ts` (lines 19, 124, 135)
- `src/app/api/orders/[orderId]/cancel/route.ts` (line 111)
- `src/components/order-status-chart.tsx` (line 17)

### 3. Remove Unused Variables
Remove or use these unused variables:
- `src/app/api/auth/seed-admin/route.ts`: `admin` variable (line 23)
- `src/app/api/dashboard/stats/route.ts`: `orderChange` variable (line 74)
- `src/app/api/inventory/locations/route.ts`: `request` parameter (line 50)
- `src/app/api/inventory/route.ts`: `NextRequest` import (line 1)
- `src/app/api/inventory/seed-locations/route.ts`: `locations` variable (line 17)

### 4. Fix React Hook Dependencies
Add missing dependencies to useEffect hooks in:
- `src/app/dashboard/customers/page.tsx` (lines 219, 588, 640)
- `src/app/dashboard/inventory/page.tsx` (line 503)
- `src/app/dashboard/products/page.tsx` (line 424)
- `src/components/stock-history-modal.tsx` (line 53)
- `src/components/comp-485.tsx` (lines 283, 290, 295)

### 5. Fix Empty Object Types
Replace `{}` types with proper interfaces in:
- `src/components/ui/textarea.tsx` (line 5)

## Priority 2: Configure ESLint to Ignore Generated Files

Create or update `.eslintrc.js` to exclude Prisma generated files:

```javascript
module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Add custom rules here if needed
  },
  ignorePatterns: [
    'src/generated/**/*',
    '**/*.d.ts'
  ]
}
```

## Priority 3: Fix Image Optimization Warnings
Replace `<img>` tags with Next.js `<Image>` component in:
- `src/components/contacts-table.tsx` (lines 149, 233)

Import: `import Image from 'next/image'`

## Commands to Run After Fixes

1. `npm run lint` - Check remaining ESLint errors
2. `npm run build` - Test local build
3. `git add . && git commit -m "Fix ESLint errors for Vercel deployment"`
4. `git push` - Trigger new Vercel deployment

## Expected Outcome
- All ESLint errors in application code should be resolved
- Vercel build should pass the linting phase
- Deployment should succeed

Focus on the application code files first (Priority 1) as these are the most critical for deployment success. The Prisma generated files can be handled by updating the ESLint configuration to ignore them.