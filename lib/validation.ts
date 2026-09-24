import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export const signupSchema = z
  .object({
    email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptedTerms: z.boolean().refine((val) => val === true, {
      message: 'You must agree to the Terms and authorization mandate',
    }),
    honeypot: z.string().max(0, 'Spam detected').optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const resetPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address').toLowerCase().trim(),
});

export const createTargetSchema = z.object({
  name: z.string().min(2, 'API name must be at least 2 characters').max(60).trim(),
  baseUrl: z
    .string()
    .url('Please enter a valid base URL (e.g. https://api.example.com)')
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return parsed.protocol === 'https:' || parsed.protocol === 'http:';
        } catch {
          return false;
        }
      },
      { message: 'URL must use http:// or https://' }
    ),
  specUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  verificationMethod: z.enum(['dns_txt', 'well_known']),
});

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name is required').max(100).trim(),
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  company: z.string().max(100).optional(),
  message: z.string().min(10, 'Message must be at least 10 characters').max(2000).trim(),
  source: z.enum(['contact', 'waitlist']).default('contact'),
  honeypot: z.string().max(0, 'Spam detected').optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type CreateTargetInput = z.infer<typeof createTargetSchema>;
export type ContactFormInput = z.infer<typeof contactFormSchema>;
