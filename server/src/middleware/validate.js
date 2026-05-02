const { z } = require('zod');

/**
 * Returns an Express middleware that validates req.body against a Zod schema.
 * On failure: responds with 400 + list of field errors.
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.body = result.data; // use coerced/default-applied data
    next();
  };
}

// --- Shared Schemas ---

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password too long'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password required'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

const updateSettingsSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/)
    .optional(),
  preferences: z
    .object({
      theme: z.enum(['dark', 'light']).optional(),
      sound: z.boolean().optional(),
      animations: z.boolean().optional(),
      defaultTimeControl: z.enum(['60', '180', '300', '600', '900']).optional(),
      boardOrientation: z.enum(['white', 'black']).optional(),
    })
    .optional(),
});

const createGameSchema = z.object({
  timeControl: z.enum(['60', '180', '300', '600', '900']),
  increment: z.number().int().min(0).max(60).default(0),
  vsBot: z.boolean().default(false),
  botElo: z.number().int().optional(),
  color: z.enum(['white', 'black', 'random']).default('random'),
});

const submitPuzzleSchema = z.object({
  puzzleId: z.string().uuid(),
  moves: z.array(z.string().regex(/^[a-h][1-8][a-h][1-8][qrbnQRBN]?$/)),
  timeTaken: z.number().int().min(0).max(300),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  changePasswordSchema,
  updateSettingsSchema,
  createGameSchema,
  submitPuzzleSchema,
};
