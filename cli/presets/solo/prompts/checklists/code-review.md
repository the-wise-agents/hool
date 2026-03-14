# Code Review Checklist

Baseline checklist loaded by Tech Leads during Phase 9 (Code Review). This is the starting floor — project-specific items accumulate in `best-practices.md` over time.

## Security (OWASP Top 10)
- [ ] No SQL injection — parameterized queries, no string concatenation in queries
- [ ] No XSS — user input is escaped/sanitized before rendering
- [ ] No exposed secrets — no API keys, tokens, passwords in source code
- [ ] No command injection — no unsanitized user input in shell commands
- [ ] Auth checks on protected routes — middleware enforces authentication
- [ ] Authorization verified — users can only access their own resources
- [ ] CORS configured correctly — not wildcard (*) in production
- [ ] Rate limiting on auth endpoints — login, signup, password reset
- [ ] No sensitive data in logs — no passwords, tokens, PII in log output
- [ ] Dependencies scanned — no known critical vulnerabilities

## API Design
- [ ] Response shapes match contracts exactly — field names, types, nesting
- [ ] HTTP status codes match contracts — 200, 201, 400, 401, 403, 404, 500
- [ ] Error responses use documented format — { error: code, message: string }
- [ ] Validation errors include field-level detail
- [ ] Pagination on list endpoints — no unbounded queries
- [ ] Consistent naming — camelCase or snake_case, not mixed

## Performance
- [ ] No N+1 queries — use joins or batch loading
- [ ] Database indexes used for filtered/sorted queries
- [ ] No unbounded lists — pagination or limit on all collection endpoints
- [ ] No synchronous blocking in async code paths
- [ ] Large files/images lazy loaded (FE)
- [ ] Bundle size reasonable — no unnecessary large dependencies (FE)

## Accessibility (WCAG 2.1 AA)
- [ ] Semantic HTML — headings, landmarks, lists, buttons (not div-as-button)
- [ ] All interactive elements keyboard accessible
- [ ] Form inputs have associated labels
- [ ] Color contrast meets AA ratio (4.5:1 for text)
- [ ] Images have alt text
- [ ] Focus management on route changes and modals

## Code Quality
- [ ] Single responsibility — each function/component does one thing
- [ ] No hardcoded values — use constants, env vars, or config
- [ ] Error handling present — loading, error, empty states handled
- [ ] Logging present — user actions, API calls, errors logged
- [ ] No dead code — unused imports, variables, functions removed
- [ ] Consistent patterns — follows conventions from LLD
