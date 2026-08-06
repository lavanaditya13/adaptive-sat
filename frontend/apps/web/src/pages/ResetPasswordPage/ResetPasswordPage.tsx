import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@workspace/ui/components/button';
import { Input } from '@workspace/ui/components/input';
import { Label } from '@workspace/ui/components/label';
import { resetPassword } from '@/services/auth-service';
import { useToast } from '@/components/toast/toast-provider';
import { getApiErrorDetail } from '@/utils/api-errors';
import { ROUTES } from '@/constants/routes';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) {
      toast({
        title: 'Missing reset token',
        description: 'Request a new password reset link.',
        variant: 'destructive',
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: 'Passwords do not match',
        description: 'Make sure both password fields are identical.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token, password);
      toast({
        title: 'Password updated',
        description: 'You can now sign in with your new password.',
        variant: 'success',
      });
      navigate(ROUTES.LOGIN);
    } catch (error) {
      toast({
        title: 'Could not reset password',
        description: getApiErrorDetail(error),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-svh items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center ring-1 ring-foreground/10">
          <h1 className="font-heading text-2xl font-semibold">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This link is missing its reset token.
          </p>
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

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 text-center ring-1 ring-foreground/10">
        <h1 className="font-heading text-2xl font-semibold">Set a new password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </div>
    </div>
  );
}