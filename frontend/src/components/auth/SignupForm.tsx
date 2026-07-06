'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { signupSchema, SignupInput } from '../../utils/validation-schemas';
import { authService } from '../../services/auth-service';
import { useAuthStore } from '../../store/auth-store';
import { ROUTES } from '../../constants/routes';
import { parseApiError } from '../../utils/parse-api-error';
import { TextInput } from '../ui/TextInput';
import { PasswordInput } from '../ui/PasswordInput';
import { RadioGroup } from '../ui/RadioGroup';
import { Button } from '../ui/Button';

export default function SignupForm() {
    const router = useRouter();
    const loginStore = useAuthStore((state) => state.login);
    const [generalError, setGeneralError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        control,
        setError,
        formState: { errors, isSubmitting },
    } = useForm<SignupInput>({
        resolver: zodResolver(signupSchema),
        defaultValues: {
            full_name: '',
            email: '',
            password: '',
            role: 'student',
        },
    });

    const onSubmit = async (data: SignupInput) => {
        setGeneralError(null);
        try {
            const response = await authService.signup(data);
            loginStore(response.user, response.access_token, response.refresh_token);
            router.push(ROUTES.DASHBOARD);
        } catch (error) {
            const parsed = parseApiError(error);
            if (parsed.field) {
                setError(parsed.field as keyof SignupInput, {
                    type: 'server',
                    message: parsed.message,
                });
            } else {
                setGeneralError(parsed.message);
            }
        }
    };

    const roleOptions = [
        { label: 'Student', value: 'student' },
        { label: 'Parent', value: 'parent' },
        { label: 'Tutor', value: 'tutor' },
    ];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 w-full">
            {generalError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-sm font-medium text-red-400">
                    {generalError}
                </div>
            )}

            <TextInput
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                error={errors.full_name?.message}
                {...register('full_name')}
            />

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

            <Controller
                name="role"
                control={control}
                render={({ field }) => (
                    <RadioGroup
                        label="I am a..."
                        options={roleOptions}
                        value={field.value}
                        onChange={field.onChange}
                        error={errors.role?.message}
                    />
                )}
            />

            <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full">
                Create Account
            </Button>
        </form>
    );
}
