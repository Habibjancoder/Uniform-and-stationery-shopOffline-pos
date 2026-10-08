import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl p-8 border border-slate-700 text-center shadow-xl">
        <h1 className="text-4xl font-extrabold text-blue-400 mb-2">404</h1>
        <h2 className="text-xl font-bold mb-4">Page Not Found</h2>
        <p className="text-slate-400 text-sm mb-6">
          The requested page could not be found. Please return to the POS dashboard.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-sm shadow-md"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
