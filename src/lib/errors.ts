// Distinguishes authorization failures from ordinary validation errors so
// API routes can return 403 instead of 400.
export class ForbiddenError extends Error {}
