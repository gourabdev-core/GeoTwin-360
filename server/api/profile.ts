import { Router, Request, Response } from 'express';
import { supabase } from '../config/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { DatabaseProfile, UserPreferences } from '../types/database.js';

const router = Router();

// In-memory fallback profile cache for test/dev environments when DB table is pending migration
const memoryProfiles = new Map<string, DatabaseProfile>();

const VALID_ROLES = [
  'Sustainability Lead',
  'Urban Planner',
  'Climate Risk Analyst',
  'ESG Manager',
  'GIS Specialist',
  'Municipal Official',
  'Researcher',
  'Environmental Researcher',
  'USER',
  'ADMIN',
];

const VALID_YEARS = [2030, 2035, 2040, 2050];
const VALID_SCENARIOS = ['baseline', 'resilience', 'accelerated'];
const VALID_UNITS = ['celsius', 'fahrenheit'];

/**
 * GET /api/v1/profile
 * Returns the profile and preferences for the currently authenticated user.
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('[Profile API] Database query warning, falling back to memory/synthesized profile:', error.message);
    }

    if (data) {
      res.json({
        status: 'success',
        data,
      });
      return;
    }

    // Check memory fallback
    if (memoryProfiles.has(user.id)) {
      res.json({
        status: 'success',
        data: memoryProfiles.get(user.id),
      });
      return;
    }

    // Synthesize profile from user metadata
    const meta = user.user_metadata || {};
    const synthesizedProfile: DatabaseProfile = {
      id: user.id,
      full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'User',
      email: user.email || '',
      avatar_url: meta.avatar_url || null,
      role: 'Sustainability Lead',
      organization: null,
      preferences: {
        temperatureUnit: 'celsius',
        defaultTargetYear: 2035,
        defaultScenario: 'resilience',
        defaultLocationId: 'loc-22.5726-88.3639',
        defaultLocationName: 'Kolkata, West Bengal, India',
      },
      created_at: user.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    memoryProfiles.set(user.id, synthesizedProfile);

    res.json({
      status: 'success',
      data: synthesizedProfile,
    });
  } catch (err: any) {
    console.error('[Profile API] GET profile failed:', err);
    res.status(500).json({
      status: 'error',
      code: 'PROFILE_FETCH_FAILED',
      message: 'Failed to retrieve user profile.',
    });
  }
});

/**
 * PATCH /api/v1/profile
 * Updates the user's profile and preferences.
 */
router.patch('/', requireAuth, async (req: Request, res: Response) => {
  const user = req.user!;
  const { full_name, role, organization, avatar_url, preferences } = req.body;

  // Validation
  const updates: Partial<DatabaseProfile> = {};

  if (full_name !== undefined) {
    if (typeof full_name !== 'string' || full_name.trim().length === 0 || full_name.length > 120) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'full_name must be a non-empty string under 120 characters.',
      });
      return;
    }
    updates.full_name = full_name.trim();
  }

  if (role !== undefined) {
    if (typeof role !== 'string' || role.length > 50) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'role must be a string under 50 characters.',
      });
      return;
    }
    updates.role = role.trim();
  }

  if (organization !== undefined) {
    if (organization !== null && (typeof organization !== 'string' || organization.length > 150)) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'organization must be null or a string under 150 characters.',
      });
      return;
    }
    updates.organization = organization ? organization.trim() : null;
  }

  if (avatar_url !== undefined) {
    if (avatar_url !== null && typeof avatar_url !== 'string') {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'avatar_url must be a string or null.',
      });
      return;
    }
    updates.avatar_url = avatar_url;
  }

  if (preferences !== undefined) {
    if (typeof preferences !== 'object' || preferences === null || Array.isArray(preferences)) {
      res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: 'preferences must be a valid object.',
      });
      return;
    }

    const prefUpdates: Partial<UserPreferences> = {};

    if (preferences.temperatureUnit !== undefined) {
      if (!VALID_UNITS.includes(preferences.temperatureUnit)) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: `temperatureUnit must be one of: ${VALID_UNITS.join(', ')}`,
        });
        return;
      }
      prefUpdates.temperatureUnit = preferences.temperatureUnit;
    }

    if (preferences.defaultTargetYear !== undefined) {
      const yearNum = Number(preferences.defaultTargetYear);
      if (!VALID_YEARS.includes(yearNum)) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: `defaultTargetYear must be one of: ${VALID_YEARS.join(', ')}`,
        });
        return;
      }
      prefUpdates.defaultTargetYear = yearNum as any;
    }

    if (preferences.defaultScenario !== undefined) {
      if (!VALID_SCENARIOS.includes(preferences.defaultScenario)) {
        res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: `defaultScenario must be one of: ${VALID_SCENARIOS.join(', ')}`,
        });
        return;
      }
      prefUpdates.defaultScenario = preferences.defaultScenario;
    }

    if (preferences.defaultLocationId !== undefined) {
      prefUpdates.defaultLocationId = preferences.defaultLocationId ? String(preferences.defaultLocationId) : null;
    }

    if (preferences.defaultLocationName !== undefined) {
      prefUpdates.defaultLocationName = preferences.defaultLocationName ? String(preferences.defaultLocationName) : null;
    }

    updates.preferences = prefUpdates as UserPreferences;
  }

  try {
    // Attempt database update
    let updatedProfile: DatabaseProfile | null = null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (!error && data) {
        updatedProfile = data as DatabaseProfile;
      }
    } catch (dbErr) {
      console.warn('[Profile API] Database update notice:', dbErr);
    }

    // If DB is pending migration, update memory cache
    if (!updatedProfile) {
      const existing = memoryProfiles.get(user.id) || {
        id: user.id,
        full_name: user.email?.split('@')[0] || 'User',
        email: user.email || '',
        avatar_url: null,
        role: 'Sustainability Lead',
        organization: null,
        preferences: {
          temperatureUnit: 'celsius',
          defaultTargetYear: 2035,
          defaultScenario: 'resilience',
        },
        created_at: user.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      updatedProfile = {
        ...existing,
        ...updates,
        preferences: {
          ...(existing.preferences || {
            temperatureUnit: 'celsius',
            defaultTargetYear: 2035,
            defaultScenario: 'resilience',
          }),
          ...(updates.preferences || {}),
        },
        updated_at: new Date().toISOString(),
      };

      memoryProfiles.set(user.id, updatedProfile);
    }

    res.json({
      status: 'success',
      data: updatedProfile,
    });
  } catch (err: any) {
    console.error('[Profile API] PATCH profile failed:', err);
    res.status(500).json({
      status: 'error',
      code: 'PROFILE_UPDATE_FAILED',
      message: 'Failed to update profile.',
    });
  }
});

export default router;
