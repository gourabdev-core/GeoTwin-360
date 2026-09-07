import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';

const router = Router();

/**
 * GET /api/v1/auth/google-status
 * Checks whether the Google OAuth provider is actively enabled in the Supabase project.
 */
router.get('/google-status', async (_req: Request, res: Response) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    if (!supabaseUrl) {
      return res.json({
        enabled: false,
        reason: 'SUPABASE_URL_MISSING',
        message: 'Supabase URL is not configured in server environment.',
      });
    }

    const probeUrl = `${supabaseUrl}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(
      'http://localhost:5173'
    )}`;

    const probeResponse = await fetch(probeUrl, {
      method: 'GET',
      redirect: 'manual',
    });

    if (probeResponse.status === 400) {
      const body = await probeResponse.json().catch(() => ({}));
      if (body.msg?.includes('Unsupported provider') || body.error_code === 'validation_failed') {
        return res.json({
          enabled: false,
          reason: 'PROVIDER_NOT_ENABLED',
          message:
            'Google OAuth provider is not enabled in your Supabase project (Authentication > Providers > Google).',
        });
      }
    }

    // A 302/303 redirect means Supabase has valid Google provider configuration and redirects to accounts.google.com
    const isRedirect = probeResponse.status === 302 || probeResponse.status === 303 || probeResponse.status === 200;
    return res.json({
      enabled: isRedirect,
      reason: isRedirect ? 'CONFIGURED' : 'UNKNOWN',
      message: isRedirect ? 'Google OAuth is enabled.' : 'Unable to confirm Google OAuth status.',
    });
  } catch (error: any) {
    return res.json({
      enabled: false,
      reason: 'PROBE_FAILED',
      message: 'Failed to verify Google OAuth status.',
    });
  }
});

export default router;
