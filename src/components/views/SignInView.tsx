import { useAuth } from "../../lib/auth/AuthProvider";

export function SignInView() {
  const { signInWithMicrosoft } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#e8e8e8]">
      <div className="w-full max-w-md bg-white border border-gray-300 rounded-lg shadow-sm">
        <div className="px-6 py-5 border-b border-gray-300 bg-[#f5f5f5] rounded-t-lg">
          <h1 className="text-lg font-semibold text-[#2d3e50]">
            Sign in
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Use your Prompt and Pause Microsoft account.
          </p>
        </div>
        <div className="px-6 py-6">
          <button
            onClick={() => void signInWithMicrosoft()}
            className="w-full px-4 py-2 bg-[#4a9eff] text-white text-sm rounded hover:bg-[#3a8eef] transition-colors"
          >
            Sign in with Microsoft
          </button>
        </div>
      </div>
    </div>
  );
}
