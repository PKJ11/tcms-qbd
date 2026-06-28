export default function ForgotPasswordPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: '#f4f6f8' }}
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border p-8 text-center"
        style={{ borderColor: '#e5e7eb' }}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Forgot password?
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Contact your QA Training Coordinator or Super Admin
          to reset your password.
        </p>
        <a
          href="/login"
          className="text-sm font-medium hover:underline"
          style={{ color: '#2d6a4f' }}
        >
          ← Back to login
        </a>
      </div>
    </div>
  )
}