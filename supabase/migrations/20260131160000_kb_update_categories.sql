-- Update existing KB articles with their categories
-- These articles were inserted before the category column existed

UPDATE public.knowledge_articles SET category = 'Onboarding' WHERE slug = 'welcome-first-day';
UPDATE public.knowledge_articles SET category = 'Onboarding' WHERE slug = 'getting-started-rds';
UPDATE public.knowledge_articles SET category = 'IT Support' WHERE slug = 'common-rds-issues';
UPDATE public.knowledge_articles SET category = 'IT Support' WHERE slug = 'contacting-it-support';
UPDATE public.knowledge_articles SET category = 'How-to Guides' WHERE slug = 'save-files-onedrive';
UPDATE public.knowledge_articles SET category = 'How-to Guides' WHERE slug = 'set-email-signature';
UPDATE public.knowledge_articles SET category = 'How-to Guides' WHERE slug = 'how-to-print';
UPDATE public.knowledge_articles SET category = 'FAQ' WHERE slug = 'frequently-asked-questions';
UPDATE public.knowledge_articles SET category = 'FAQ' WHERE slug = 'quick-reference-card';
UPDATE public.knowledge_articles SET category = 'Policies & Compliance' WHERE slug = 'acceptable-use-policy';
UPDATE public.knowledge_articles SET category = 'Policies & Compliance' WHERE slug = 'data-protection-privacy';
UPDATE public.knowledge_articles SET category = 'Security & Access' WHERE slug = 'password-best-practices';
UPDATE public.knowledge_articles SET category = 'Security & Access' WHERE slug = 'recognizing-phishing';
UPDATE public.knowledge_articles SET category = 'HR & Benefits' WHERE slug = 'time-off-requests';
UPDATE public.knowledge_articles SET category = 'Software & Tools' WHERE slug = 'microsoft-office-quick-start';
