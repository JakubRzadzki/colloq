/**
 * Captcha Component - Anti-Bot Protection
 * Implements a simple Math Challenge. Humans solve it; bots typically fail.
 * Optional: Honeypot field for additional protection.
 */
import { useState, useMemo, useEffect } from 'react';

interface CaptchaProps {
  onValidChange: (valid: boolean) => void;
  /** Optional: honeypot field name - bots fill this, humans leave empty */
  honeypotName?: string;
  honeypotValue?: string;
  setHoneypotValue?: (v: string) => void;
}

export function Captcha({ onValidChange, honeypotName = 'website_url', honeypotValue = '', setHoneypotValue }: CaptchaProps) {
  const [answer, setAnswer] = useState('');
  const { a, b, sum } = useMemo(() => {
    const x = Math.floor(Math.random() * 8) + 2;
    const y = Math.floor(Math.random() * 8) + 2;
    return { a: x, b: y, sum: x + y };
  }, []);

  const isValid = answer.trim() === String(sum);
  const isHoneypotEmpty = !honeypotValue || honeypotValue.trim() === '';

  useEffect(() => {
    onValidChange(isValid && isHoneypotEmpty);
  }, [isValid, isHoneypotEmpty, onValidChange]);

  return (
    <div className="space-y-3">
      {/* Math Challenge */}
      <div className="form-control">
        <label className="label">
          <span className="label-text opacity-70">
            Anti-spam: What is {a} + {b}?
          </span>
        </label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="?"
          className="glass-input w-24"
          autoComplete="off"
        />
        {answer && !isValid && (
          <p className="text-xs text-red-400 mt-1">Incorrect. Try again.</p>
        )}
        {isValid && (
          <p className="text-xs text-green-400 mt-1">Correct!</p>
        )}
      </div>

      {/* Honeypot - hidden from humans, bots fill it */}
      <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
        <label htmlFor={honeypotName}>Leave this empty</label>
        <input
          id={honeypotName}
          name={honeypotName}
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypotValue}
          onChange={(e) => setHoneypotValue?.(e.target.value)}
        />
      </div>
    </div>
  );
}

/**
 * Hook to use Captcha validation in forms.
 */
export function useCaptcha() {
  const [isValid, setIsValid] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  return {
    isValid,
    honeypot,
    setHoneypot,
    CaptchaWrapper: () => (
      <Captcha
        onValidChange={setIsValid}
        honeypotValue={honeypot}
        setHoneypotValue={setHoneypot}
      />
    ),
  };
}
