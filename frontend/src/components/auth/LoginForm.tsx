'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, LoginInput } from '../../utils/validation-schemas';
import { authService } from '../../services/auth-service';
import { useAuthStore } from '../../store/auth-store';
import { ROUTES } from '../../constants/routes';
import { parseApiError } from '../../utils/parse-api-error';
import { TextInput } from '../ui/TextInput';
import { PasswordInput } from '../ui/PasswordInput';
import { Button } from '../ui/Button';

export default function LoginForm() {
    const router = useRouter();
    const loginStore = useAuthStore((state) => state.login);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<LoginInput>({
        resolver: zodResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    const onSubmit = async (data: LoginInput) => {
        setGeneralError(null);
        try {
            const response = await authService.login(data);
            loginStore(response.user, response.access_token, response.refresh_token);
            router.push(ROUTES.DASHBOARD);
        } catch (error) {
            const parsed = parseApiError(error);
            if (parsed.field) {
                // Map backend field error to form field
                setError(parsed.field as keyof LoginInput, {
                    type: 'server',
                    message: parsed.message,
                });
            } else {
                setGeneralError(parsed.message);
            }
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full">
            {generalError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-400">
                    {generalError}
                </div>
            )}

            <TextInput
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                {...register('email')}
            />

            <PasswordInput
                label="Password"
                placeholder="••••••••"
                error={errors.password?.message}
                {...register('password')}
            />

            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                Sign In
            </Button>
        </form>
    );
}
