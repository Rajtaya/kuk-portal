'use client';

import { useRef, useCallback, useEffect } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

interface Props {
  onVerify: (token: string | null) => void;
}

export function Recaptcha({ onVerify }: Props) {
  const ref = useRef<ReCAPTCHA>(null);

  const handleChange = useCallback((token: string | null) => {
    onVerify(token);
  }, [onVerify]);

  const handleExpired = useCallback(() => {
    onVerify(null);
  }, [onVerify]);

  useEffect(() => {
    if (!SITE_KEY) onVerify('skip');
  }, [onVerify]);

  if (!SITE_KEY) return null;

  return (
    <div className="flex justify-center">
      <ReCAPTCHA
        ref={ref}
        sitekey={SITE_KEY}
        onChange={handleChange}
        onExpired={handleExpired}
        onErrored={handleExpired}
      />
    </div>
  );
}

export function isCaptchaEnabled() {
  return !!SITE_KEY;
}
