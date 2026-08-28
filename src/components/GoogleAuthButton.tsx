interface GoogleAuthButtonProps {
  onClick: () => void;
  label?: string;
}

export default function GoogleAuthButton({ onClick, label = 'Continue with Google' }: GoogleAuthButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center space-x-2.5 rounded-full border border-gray-200 bg-white py-3 font-sans text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:scale-[0.99]"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1C3.25 21.3 7.31 24 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.27a7.24 7.24 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.74l4-3.1z" />
        <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.25 2.7 1.27 6.63l4 3.1C6.22 6.88 8.87 4.77 12 4.77z" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
