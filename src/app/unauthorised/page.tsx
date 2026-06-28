export default function UnauthorisedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-xl shadow text-center">
        <h1 className="text-2xl font-semibold text-red-600 mb-2">
          Access Denied
        </h1>
        <p className="text-gray-500 text-sm">
          You do not have permission to view this page.
        </p>
      </div>
    </div>
  )
}