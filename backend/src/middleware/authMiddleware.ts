import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// We only use the Supabase client here if we need to fetch user data
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email?: string;
        [key: string]: any;
    };
}

/**
 * Middleware to verify Supabase JWTs.
 * The frontend sends the JWT in the Authorization header as a Bearer token.
 */
export function requireSupabaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ detail: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Supabase signs JWTs with the project's JWT Secret.
        // However, the `@supabase/supabase-js` client provides a `getUser` method
        // which securely calls the Supabase Auth server to validate the token.
        // We'll use this method because it's officially supported and handles key rotation.

        // As this is a middleware, `getUser` might introduce a slight latency due to the network call.
        // A faster approach is verifying the JWT locally using `jsonwebtoken` and the JWT_SECRET,
        // but we would need the user to provide SUPABASE_JWT_SECRET in .env.
        // In Zea, the existing token was a simple shared string (ELISA_AUTH_TOKEN).
        // So let's fallback to the shared token if running locally/in Electron,
        // OR we verify the Supabase token by calling the Supabase Auth API.

        const isLocalDevToken = token === process.env.ELISA_AUTH_TOKEN && process.env.ELISA_AUTH_TOKEN !== undefined;
        if (isLocalDevToken) {
            req.user = { id: 'local-dev-user' };
            return next();
        }

        // Call Supabase to check the token
        supabase.auth.getUser(token)
            .then(({ data, error }) => {
                if (error || !data.user) {
                    return res.status(401).json({ detail: 'Invalid Supabase token' });
                }

                req.user = {
                    id: data.user.id,
                    email: data.user.email,
                };
                next();
            })
            .catch((err) => {
                res.status(401).json({ detail: 'Invalid Supabase token' });
            });

    } catch (err) {
        res.status(401).json({ detail: 'Invalid token format' });
    }
}
