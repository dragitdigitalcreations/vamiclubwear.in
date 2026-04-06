import { AdminHeader } from '@/components/admin/AdminHeader'
import { ProductUploadForm } from '@/components/admin/ProductUploadForm'
import { RBACGuard } from '@/components/admin/RBACGuard'

export const metadata = { title: 'New Product' }

export default function NewProductPage() {
  return (
    <RBACGuard section="products" redirectTo="/admin/dashboard">
      <AdminHeader
        title="New Product"
        subtitle="Fill in product details and add variants across all 5 dimensions"
      />
      <div className="p-6">
        <ProductUploadForm />
      </div>
    </RBACGuard>
  )
}
