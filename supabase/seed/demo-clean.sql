-- ==============================================================================
-- BORRA SOLO LOS DATOS DEMO (marca «DEMO - » + id ≥ 9001). Generado por: npm run seed:demo:sql
-- No toca datos reales. Los datos reales nunca tienen ids ≥ 9001 con esa marca.
-- ==============================================================================

BEGIN;
DELETE FROM work_hours WHERE description LIKE 'DEMO - %' AND id > 9000;
DELETE FROM tasks WHERE title LIKE 'DEMO - %' AND id > 9000;
DELETE FROM sprints WHERE name LIKE 'DEMO - %' AND id > 9000;
DELETE FROM movements WHERE movement_code LIKE 'DEMO-%' AND id > 9000;
DELETE FROM budgets WHERE comment LIKE 'DEMO - %' AND id > 9000;
DELETE FROM corp_allocation WHERE note LIKE 'DEMO - %' AND id > 9000;
DELETE FROM project_payments WHERE payment_method LIKE 'DEMO - %' AND id > 9000;
DELETE FROM users WHERE email LIKE '%@demo.blackbelt.local' AND id > 9000;
DELETE FROM projects WHERE name LIKE 'DEMO - %' AND id > 9000;
DELETE FROM clients WHERE name LIKE 'DEMO - %' AND id > 9000;
DELETE FROM specialists WHERE full_name LIKE 'DEMO - %' AND id > 9000;
COMMIT;
