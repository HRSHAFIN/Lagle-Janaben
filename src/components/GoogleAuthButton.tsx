import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    google?: any;
  }
}

interface GoogleAuthButtonProps {
  onCredential: (credential: string) => void;
  text?: 'signin_with' | 'signup_with';
}

export default function GoogleAuthButton({ onCredential, text = 'signin_with' }: GoogleAuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  onCredentialRef.current = onCredential;

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || !buttonRef.current) return;

    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | undefined;

    const renderButton = () => {
      if (cancelled || !window.google?.accounts?.id || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => onCredentialRef.current(response.credential),
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        width: 360,
        text,
      });
    };

    if (window.google?.accounts?.id) {
      renderButton();
    } else {
      pollId = setInterval(() => {
        if (window.google?.accounts?.id) {
          if (pollId) clearInterval(pollId);
          renderButton();
        }
      }, 200);
      setTimeout(() => pollId && clearInterval(pollId), 10000);
    }

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
  }, [clientId, text]);

  if (!clientId) {
    return (
      <div className="w-full rounded-full border border-dashed border-gray-200 py-3 text-center font-sans text-xs text-gray-400">
        Google Sign-In isn't configured yet
      </div>
    );
  }

  return <div ref={buttonRef} className="flex w-full justify-center [&>div]:!w-full" />;
}
