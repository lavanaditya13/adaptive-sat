import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { requestPasswordReset } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import { ROUTES } from '@/constants/routes';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      toast({
        title: 'Email required',
        description: 'Enter the email address for your account.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestPasswordReset(trimmedEmail);
      toast({
        title: 'Reset link sent',
        description: 'If an account exists, check your inbox for the reset link.',
        variant: 'success',
      });
      navigate(ROUTES.LOGIN);
    } catch (error) {
      toast({
        title: 'Could not send reset link',
        description: getApiErrorDetail(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center ring-1 ring-foreground/10">
        <h1 className="font-heading text-2xl font-semibold">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send a reset link if the account exists.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">Email</Label>
            <Input
              id="forgot-password-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => navigate(ROUTES.LOGIN)}
          className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Back to login
        </button>
      </div>
    </div>
  );
}